resource "terraform_data" "subnet_check" {
  lifecycle {
    precondition {
      condition     = length(data.aws_subnets.public.ids) >= 2
      error_message = "The default VPC must expose at least two subnets (two AZs) so the ALB can be created. Add subnets or point this stack at a dedicated VPC."
    }
  }
}
