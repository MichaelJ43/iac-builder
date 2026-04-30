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

variable "custom_domain" {
  type        = string
  description = "Optional CloudFront alternate domain (e.g. iacbuilder.example.com). Only applied when acm_certificate_arn is also set. ACM public certificate must be in us-east-1 and include this name (DNS validation recommended)."
  default     = ""
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM public certificate for CloudFront (must be in us-east-1). Must cover custom_domain when set. If empty, CloudFront uses the default *.cloudfront.net certificate (no custom alias)."
  default     = ""
}

variable "route53_hosted_zone_id" {
  type        = string
  description = "Optional Route 53 public hosted zone id. When set with a valid custom domain + ACM, creates A+AAAA alias records to CloudFront. Record name is derived: apex when the zone name equals custom_domain, else a relative name under the parent zone (e.g. iacbuilder under michaelj43.dev)."
  default     = ""
}
