locals {
  create_route53_records = local.use_custom_domain && trimspace(var.route53_hosted_zone_id) != ""
}

data "aws_route53_zone" "app" {
  count   = local.create_route53_records ? 1 : 0
  zone_id = var.route53_hosted_zone_id
}

resource "aws_route53_record" "app_apex_a" {
  count   = local.create_route53_records ? 1 : 0
  zone_id = var.route53_hosted_zone_id
  name    = data.aws_route53_zone.app[0].name == local.custom_domain_host ? "" : trimsuffix(local.custom_domain_host, ".${data.aws_route53_zone.app[0].name}")
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_apex_aaaa" {
  count   = local.create_route53_records ? 1 : 0
  zone_id = var.route53_hosted_zone_id
  name    = data.aws_route53_zone.app[0].name == local.custom_domain_host ? "" : trimsuffix(local.custom_domain_host, ".${data.aws_route53_zone.app[0].name}")
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}
