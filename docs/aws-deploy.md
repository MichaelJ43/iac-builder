# AWS deploy: S3 + CloudFront + ALB + Lambda (us-east-1)

**Hand-holding checklist:** use **[`docs/aws-setup-walkthrough.md`](aws-setup-walkthrough.md)** (committed). For a **non-committed** copy with your account IDs and ARNs, copy it to the repo root as **`AWS_SETUP_WALKTHROUGH.local.md`** (that path is **gitignored**).

This stack is tuned for **low cost** in a personal account:

- **CloudFront** (`PriceClass_100`) is the single HTTPS entry: static UI from **S3** (OAI) and `/api/*` + `/healthz` forwarded to a regional **Application Load Balancer**.
- The **ALB** uses a **Lambda** target (no EC2/Fargate). Same Go `chi` router as containers, packaged as `provided.al2023` with a `bootstrap` binary.
- **Optional ALB HTTPS** (`alb_https_enabled`): ACM certificate on **443**, **301** from **80 → 443**, and CloudFront **HTTPS-only** to the API origin. Requires an **ACM cert in the same region as the ALB** and a **public hostname** (on that cert) whose DNS **CNAME** points at the ALB. Without this, the stack keeps **HTTP** on port **80** only (still fine behind CloudFront for many setups).
- **SQLite on `/tmp`** inside Lambda is **ephemeral** (profiles reset on cold starts). For durable storage, evolve toward **RDS/DynamoDB/EFS** later.

## Prerequisites

1. **S3 bucket for Terraform state** (e.g. `mycompany-tfstate-us-east-1`) with versioning recommended. Note the bucket name.
2. **GitHub OIDC** trust in AWS (no long-lived access keys in the repo):
   - Create an **IAM OIDC provider** for `https://token.actions.githubusercontent.com` if you do not already have one.
   - Create an **IAM role** trusted for `sts:AssumeRoleWithWebIdentity` with a condition on your repository, for example:
     - `token.actions.githubusercontent.com:aud` = `sts.amazonaws.com`
     - `token.actions.githubusercontent.com:sub` = `repo:MichaelJ43/iac-builder:ref:refs/heads/main` (tighten further with GitHub Environments if you like).
   - Attach policies that allow Terraform to manage the resources in [`deploy/terraform/aws`](../deploy/terraform/aws). For a first pass in a sandbox account, **AdministratorAccess** is simplest; narrow over time.
3. **GitHub repository configuration** (either **Secrets** or **Variables** — same names; secrets take precedence if both exist)
   - `AWS_DEPLOY_ROLE_ARN` — ARN of the role above.
   - `TF_STATE_BUCKET` — state bucket **name** from step 1 (not an ARN).  
   Prefer **Secrets** for `AWS_DEPLOY_ROLE_ARN` on public repos (variables are readable by anyone with repo read access).

## Manual deploy (optional)

```bash
export AWS_REGION=us-east-1
./scripts/build-lambda-zip.sh "$(pwd)/dist/lambda.zip"
cd deploy/terraform/aws
terraform init -backend=false   # or configure S3 backend (see CI workflow)
terraform apply \
  -var="aws_region=$AWS_REGION" \
  -var="project_name=iac-builder" \
  -var="lambda_package=$(pwd)/../../../dist/lambda.zip"

# Optional: terminate TLS on the ALB (see docs/aws-setup-walkthrough.md §6b).
# terraform apply ... \
#   -var="alb_https_enabled=true" \
#   -var="alb_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
#   -var="api_public_hostname=api.example.com"
```

Then build the UI, `aws s3 sync` to the `ui_bucket_name` output, and create a CloudFront invalidation.

The **Deploy AWS** workflow automates build, `terraform apply`, S3 sync, and invalidation.

## Undeploy

Run the **Destroy AWS** workflow (manual). Type `DELETE` in the `confirm` input. It runs `terraform destroy` for the same state key as deploy.

## Expanding to N regions

The Terraform root is parameterized with `var.aws_region` (default **us-east-1**). To add another region:

1. Use a **separate state key** per region (the GitHub workflow already keys state by `project_name` + `aws_region`).
2. Duplicate the deploy workflow inputs with the new region **or** add a matrix strategy once you are comfortable with parallel applies.
3. Add a **second AWS provider alias** in Terraform (e.g. `provider "aws" { alias = "usw2"; region = "us-west-2" }`) and instantiate the same module twice, **or** keep one stack per region in separate root directories—pick one approach and stick to it for state isolation.

Front-door options for multi-region users:

- **Route 53** latency records pointing at each regional CloudFront distribution (or regional ALBs if you drop CloudFront in a region—usually not worth it).
- **AWS Global Accelerator** in front of regional endpoints if you need static anycast IPs (extra cost).

## Cost notes

- CloudFront + S3 for static assets is typically **pennies** at low traffic.
- ALB has an **hourly charge**; keep one ALB per region and avoid extra listeners unless needed.
- Lambda billing is **per invoke** + duration; keep memory right-sized (256 MB in Terraform as a starting point).
