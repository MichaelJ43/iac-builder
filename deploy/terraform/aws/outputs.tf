output "cloudfront_domain_name" {
  description = "HTTPS URL host for the app (same origin for UI and /api)."
  value       = aws_cloudfront_distribution.app.domain_name
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

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "iac_master_key_hex" {
  description = "Random master key generated for this environment (also in Lambda env). Treat as sensitive."
  value       = random_id.iac_master.hex
  sensitive   = true
}
