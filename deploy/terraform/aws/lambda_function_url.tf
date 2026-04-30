resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

# NONE auth URLs require BOTH InvokeFunctionUrl and InvokeFunction on the resource policy
# (AWS: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html). Missing InvokeFunction
# yields 403 from the Function URL origin; CloudFront then maps 403 → /index.html (SPA shell).
resource "aws_lambda_permission" "function_url" {
  statement_id           = "AllowFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "function_url_invoke" {
  statement_id             = "AllowInvokeViaFunctionURL"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.api.function_name
  principal                = "*"
  invoked_via_function_url = true
}
