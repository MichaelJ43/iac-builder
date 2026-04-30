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
  role          = aws_iam_role.lambda_exec.arn
  # Terraform requires handler + runtime for Zip; provided.al2023 ignores handler at invoke time.
  handler          = "bootstrap"
  runtime          = "provided.al2023"
  architectures    = ["arm64"]
  filename         = var.lambda_package
  source_code_hash = filebase64sha256(var.lambda_package)

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      IAC_MASTER_KEY            = random_id.iac_master.hex
      SQLITE_DSN                = "file:/tmp/iac-builder.sqlite?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
      APP_VERSION               = "0.1.0"
      CORS_ORIGIN               = "*"
      IAC_API_REGION            = var.aws_region
      IAC_API_ENABLED_REGIONS   = var.aws_region
      IAC_DATA_RESIDENCY_REGION = var.aws_region
      # Viewer TLS (CloudFront) + HTTPS CloudFront→Lambda Function URL origin.
      IAC_HOSTED_TLS_TERMINATION = "1"
    }
  }
}
