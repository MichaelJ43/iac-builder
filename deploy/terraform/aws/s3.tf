resource "aws_s3_bucket" "ui" {
  bucket        = "${var.project_name}-ui-${random_id.suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "ui" {
  bucket = aws_s3_bucket.ui.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ui" {
  bucket = aws_s3_bucket.ui.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# OAI avoids a circular dependency between the bucket policy and CloudFront (OAC + exact distribution ARN).
resource "aws_cloudfront_origin_access_identity" "ui" {
  comment = "${var.project_name} UI OAI"
}

resource "aws_s3_bucket_policy" "ui" {
  bucket = aws_s3_bucket.ui.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.ui.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.ui.arn}/*"
      }
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.ui]
}
