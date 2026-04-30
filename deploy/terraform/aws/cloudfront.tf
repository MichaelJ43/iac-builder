locals {
  custom_domain_host = trimspace(var.custom_domain)
  use_custom_domain  = local.custom_domain_host != "" && trimspace(var.acm_certificate_arn) != ""
  # Lambda Function URL: strip https:// — CloudFront custom_origin expects host only (see aws_lambda_function_url.api).
  cloudfront_api_origin_domain   = trimsuffix(trimprefix(trimspace(aws_lambda_function_url.api.function_url), "https://"), "/")
  cloudfront_api_origin_protocol = "https-only"
  cloudfront_comment = substr(
    "${var.project_name} UI + API (${substr(sha256(aws_lambda_function_url.api.function_url), 0, 16)})",
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
    aws_lambda_function_url.api,
    aws_lambda_permission.function_url,
  ]
}
