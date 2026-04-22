output "cloudfront_domain_name" {
  description = "CloudFront default hostname (d***.cloudfront.net)."
  value       = aws_cloudfront_distribution.app.domain_name
}

output "app_url" {
  description = "Public site URL: https://<custom_domain> when configured, else https://<cloudfront_domain_name>."
  value       = local.use_custom_domain ? "https://${local.custom_domain_host}" : "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "Use for cache invalidation after UI deploys."
  value       = aws_cloudfront_distribution.app.id
}

output "ui_bucket_name" {
  description = "S3 bucket holding static UI assets."
  value       = aws_s3_bucket.ui.id
}

output "alb_dns_name" {
  description = "Regional ALB hostname (CloudFront is the preferred entry; this is useful for debugging)."
  value       = aws_lb.api.dns_name
}

output "alb_https_enabled" {
  description = "Whether the ALB terminates TLS on 443 and CloudFront uses HTTPS to the API origin."
  value       = var.alb_https_enabled
}

output "api_public_hostname" {
  description = "When ALB HTTPS is enabled, the FQDN used as the CloudFront API origin (CNAME this to alb_dns_name). Empty otherwise."
  value       = var.alb_https_enabled ? var.api_public_hostname : ""
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "iac_master_key_hex" {
  description = "Random master key generated for this environment (also in Lambda env). Treat as sensitive."
  value       = random_id.iac_master.hex
  sensitive   = true
}
