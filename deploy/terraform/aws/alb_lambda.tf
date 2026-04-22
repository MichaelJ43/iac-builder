resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  description = local.alb_https_enabled_effective ? "ALB ingress: HTTP redirect + HTTPS for app" : "ALB ingress for CloudFront origin (HTTP)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = local.alb_https_enabled_effective ? "HTTP from internet (301 redirect to HTTPS)" : "HTTP from internet (CloudFront origin)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = local.alb_https_enabled_effective ? [1] : []
    content {
      description = "HTTPS from internet (CloudFront origin and direct clients)"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
    precondition {
      condition     = !local.alb_https_enabled_effective || (local.alb_certificate_arn_effective != "" && local.api_public_hostname_effective != "")
      error_message = "With ALB TLS (custom domain and ACM, or legacy alb_https_enabled), set certificate + API hostname, or with custom domain use the same acm_certificate_arn; api origin is api.<custom_domain>."
    }
  }
}

resource "aws_lb" "api" {
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = local.subnet_ids

  depends_on = [terraform_data.subnet_check]
}

resource "aws_lb_target_group" "api" {
  name_prefix = "tg${random_id.tg_suffix.hex}"
  target_type = "lambda"
  vpc_id      = data.aws_vpc.default.id
  # aws-lambda-go-api-proxy returns MultiValueHeaders only; ALB rejects that when
  # multi-value headers are disabled (502 LambdaInvalidResponse).
  lambda_multi_value_headers_enabled = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_iam_role" "lambda_exec" {
  name_prefix = "${var.project_name}-lambda-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role            = aws_iam_role.lambda_exec.arn
  # Terraform requires handler + runtime for Zip; provided.al2023 ignores handler at invoke time.
  handler         = "bootstrap"
  runtime         = "provided.al2023"
  architectures   = ["arm64"]
  filename        = var.lambda_package
  source_code_hash = filebase64sha256(var.lambda_package)

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      IAC_MASTER_KEY = random_id.iac_master.hex
      SQLITE_DSN     = "file:/tmp/iac-builder.sqlite?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
      APP_VERSION    = "0.1.0"
      CORS_ORIGIN    = "*"
    }
  }
}

resource "aws_lambda_permission" "alb" {
  statement_id  = "AllowExecutionFromALB"
  action          = "lambda:InvokeFunction"
  function_name   = aws_lambda_function.api.function_name
  principal       = "elasticloadbalancing.amazonaws.com"
  source_arn      = aws_lb_target_group.api.arn
}

resource "aws_lb_target_group_attachment" "api" {
  target_group_arn = aws_lb_target_group.api.arn
  target_id        = aws_lambda_function.api.arn
  depends_on       = [aws_lambda_permission.alb]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = local.alb_https_enabled_effective ? "redirect" : "forward"
    target_group_arn = local.alb_https_enabled_effective ? null : aws_lb_target_group.api.arn

    dynamic "redirect" {
      for_each = local.alb_https_enabled_effective ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_lb_listener" "https" {
  count              = local.alb_https_enabled_effective ? 1 : 0
  load_balancer_arn  = aws_lb.api.arn
  port               = 443
  protocol           = "HTTPS"
  ssl_policy         = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn    = local.alb_certificate_arn_effective

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
