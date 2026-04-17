variable "aws_region" {
  type        = string
  description = "Primary AWS region for this stack. Duplicate the root module with another provider alias to add regions."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Short name prefix for resources (letters/digits/hyphen)."
  default     = "iac-builder"
}

variable "lambda_package" {
  type        = string
  description = "Path to deployment zip containing the `bootstrap` binary (provided.al2023)."
}

variable "cloudfront_price_class" {
  type        = string
  description = "CloudFront price class; PriceClass_100 is lowest cost edge locations."
  default     = "PriceClass_100"
}

variable "alb_https_enabled" {
  type        = bool
  description = "When true, ALB serves TLS on 443 with the ACM certificate, port 80 redirects to HTTPS, and CloudFront uses HTTPS to the API origin. Requires api_public_hostname (DNS CNAME to the ALB, names on the certificate) and alb_certificate_arn (ACM in the same region as the ALB)."
  default     = false
}

variable "alb_certificate_arn" {
  type        = string
  description = "ACM certificate ARN in the ALB region (e.g. arn:aws:acm:us-east-1:123456789012:certificate/...). Required when alb_https_enabled is true."
  default     = ""
}

variable "api_public_hostname" {
  type        = string
  description = "FQDN for the API that resolves to the ALB (CNAME to the ALB DNS name). Must appear on the ACM certificate. Used as the CloudFront origin hostname when alb_https_enabled is true so TLS verification matches the cert."
  default     = ""
}
