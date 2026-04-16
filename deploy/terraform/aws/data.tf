data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  # Default VPC subnets are sufficient for an internet-facing ALB in a lab setup.
  subnet_ids = slice(sort(tolist(data.aws_subnets.public.ids)), 0, min(2, length(data.aws_subnets.public.ids)))
}
