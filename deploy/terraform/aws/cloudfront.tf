locals {
  custom_domain_host = trimspace(var.custom_domain)
  use_custom_domain  = local.custom_domain_host != "" && trimspace(var.acm_certificate_arn) != ""
  # With a browser site certificate (custom_domain + acm), use the same ACM on the ALB and pin the API
  # origin to api.<custom_domain> by default. Previews can pass a sibling hostname such as api-pr-123.<domain>.
  api_custom_domain_host        = trimspace(var.api_custom_domain)
  api_public_hostname_effective = local.use_custom_domain ? (local.api_custom_domain_host != "" ? local.api_custom_domain_host : "api.${local.custom_domain_host}") : trimspace(var.api_public_hostname)
  alb_certificate_arn_effective = local.use_custom_domain ? trimspace(var.acm_certificate_arn) : trimspace(var.alb_certificate_arn)
  # Legacy: explicit alb_https_enabled + alb_certificate_arn + api_public_hostname without CloudFront custom domain.
  alb_https_enabled_effective = local.use_custom_domain || (
    var.alb_https_enabled && trimspace(var.alb_certificate_arn) != "" && trimspace(var.api_public_hostname) != ""
  )
  api_fqdn_for_r53 = local.api_public_hostname_effective
  # CloudFront must use a hostname present on the origin certificate when using HTTPS.
  # The default ALB DNS name cannot use a typical ACM cert, so we use api_public_hostname when TLS is on.
  cloudfront_api_origin_domain   = local.alb_https_enabled_effective ? local.api_public_hostname_effective : aws_lb.api.dns_name
  cloudfront_api_origin_protocol = local.alb_https_enabled_effective ? "https-only" : "http-only"
  # depends_on must be a static list (no concat). Referencing the listener here ties
  # CloudFront updates to listener creation. Use length() so https[0] is never indexed when count=0.
  cloudfront_listener_dep_id = length(aws_lb_listener.https) > 0 ? aws_lb_listener.https[0].id : aws_lb_listener.http.id
  # AWS limits distribution comment to 128 chars; listener id is a long ARN.
  cloudfront_comment = substr(
    "${var.project_name} UI + API (${substr(sha256(local.cloudfront_listener_dep_id), 0, 16)})",
    0,
    128,
  )
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = local.cloudfront_comment
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  aliases = local.use_custom_domain ? [local.custom_domain_host] : []

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
    cloudfront_default_certificate = !local.use_custom_domain
    acm_certificate_arn            = local.use_custom_domain ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
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

  depends_on = [
    aws_s3_bucket_policy.ui,
    aws_lb_listener.http,
  ]
}
