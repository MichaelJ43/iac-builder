locals {
  # CloudFront must use a hostname present on the origin certificate when using HTTPS.
  # The default ALB DNS name cannot use a typical ACM cert, so we use api_public_hostname when TLS is on.
  cloudfront_api_origin_domain   = var.alb_https_enabled ? var.api_public_hostname : aws_lb.api.dns_name
  cloudfront_api_origin_protocol = var.alb_https_enabled ? "https-only" : "http-only"
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} UI + API"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name = aws_s3_bucket.ui.bucket_regional_domain_name
    origin_id   = "ui"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.ui.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = local.cloudfront_api_origin_domain
    origin_id   = "api"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = local.cloudfront_api_origin_protocol
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 5
    }
  }

  default_cache_behavior {
    target_origin_id       = "ui"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3.id
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  ordered_cache_behavior {
    path_pattern           = "/healthz"
    target_origin_id       = "api"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  custom_error_response {
    error_caching_min_ttl = 5
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_caching_min_ttl = 5
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  depends_on = concat(
    [aws_s3_bucket_policy.ui, aws_lb_listener.http],
    var.alb_https_enabled ? [aws_lb_listener.https[0]] : []
  )
}
