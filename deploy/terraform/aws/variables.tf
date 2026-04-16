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
