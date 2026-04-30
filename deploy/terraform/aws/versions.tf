terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # 6.28+ exposes aws_lambda_permission.invoked_via_function_url (Lambda URL NONE auth requirement).
      version = "~> 6.29"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Configure backend via CI: -backend-config=... (see docs/aws-deploy.md)
  backend "s3" {}
}
