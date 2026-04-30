# AWS deploy: S3 + CloudFront + Lambda Function URL (us-east-1)

**Hand-holding checklist:** use **[`docs/aws-setup-walkthrough.md`](aws-setup-walkthrough.md)** (committed). For a **non-committed** copy with your account IDs and ARNs, copy it to the repo root as **`AWS_SETUP_WALKTHROUGH.local.md`** (that path is **gitignored**).

This stack is tuned for **low cost** in a personal account (no Application Load Balancer hourly charge):

- **CloudFront** (`PriceClass_100`) is the single HTTPS entry for browsers: static UI from **S3** (OAI) and `/api/*` + `/healthz` forwarded to a **Lambda Function URL** origin (HTTPS).
- The **Lambda** runs the same Go `chi` router as containers, packaged as `provided.al2023` with a `bootstrap` binary. The handler accepts **HTTP API v2** payloads (Function URL) and can still handle legacy **ALB target group** payloads if you restore archived HCL (see [`deploy/terraform/aws/alb_lambda.tf.disabled`](../deploy/terraform/aws/alb_lambda.tf.disabled)).
- **`IAC_HOSTED_TLS_TERMINATION`** is set for this stack so operations/telemetry reflect viewer + origin HTTPS.
- **SQLite on `/tmp`** inside Lambda is **ephemeral** (profiles reset on cold starts). For durable storage, evolve toward **RDS/DynamoDB/EFS** later.

## Prerequisites

1. **S3 bucket for Terraform state** (e.g. `mycompany-tfstate-us-east-1`) with versioning recommended. Note the bucket name.
2. **GitHub OIDC** trust in AWS (no long-lived access keys in the repo):
   - Create an **IAM OIDC provider** for `https://token.actions.githubusercontent.com` if you do not already have one.
   - Create an **IAM role** trusted for `sts:AssumeRoleWithWebIdentity` with a condition on your repository, for example:
     - `token.actions.githubusercontent.com:aud` = `sts.amazonaws.com`
     - `token.actions.githubusercontent.com:sub` = `repo:MichaelJ43/iac-builder:ref:refs/heads/main` (tighten further with GitHub Environments if you like).
   - Attach policies that allow Terraform to manage the resources in [`deploy/terraform/aws`](../deploy/terraform/aws). For a first pass in a sandbox account, **AdministratorAccess** is simplest; narrow over time.
3. **Least-privilege IAM (optional):** if the deploy role is scoped, ensure it can manage **Lambda Function URLs** and related resource-based policies, for example:
   - `lambda:CreateFunctionUrlConfig`, `lambda:GetFunctionUrlConfig`, `lambda:UpdateFunctionUrlConfig`, `lambda:DeleteFunctionUrlConfig`
   - `lambda:AddPermission`, `lambda:RemovePermission` for `lambda:InvokeFunctionUrl` (`function_url_auth_type` **NONE** matches the Terraform in this repo)
4. **GitHub repository configuration** (either **Secrets** or **Variables** — same names; secrets take precedence if both exist)
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
```

Then build the UI, `aws s3 sync` to the `ui_bucket_name` output, and create a CloudFront invalidation.

The **Deploy AWS** workflow automates build, `terraform apply`, S3 sync, and invalidation — **no manual steps are required after merging to `main`** if the workflow succeeds.

## Custom domain (optional)

Use an **ACM public certificate in `us-east-1`** (DNS validation) that includes the **site hostname** (and a **wildcard** covering preview names if you use PR previews, e.g. `*.iacbuilder.michaelj43.dev` when previews use `pr-<n>.iacbuilder.michaelj43.dev`). Set repository **Variable** `TF_CUSTOM_DOMAIN` to the site FQDN (no `https://`) and **Secret** `TF_ACM_CERTIFICATE_ARN` to that cert. Terraform attaches it to **CloudFront** viewer only; the API origin stays the **Lambda Function URL** hostname (AWS-managed TLS between CloudFront and Lambda).

Optional **Secret** `TF_ROUTE53_HOSTED_ZONE_ID` creates **A** and **AAAA** alias records to **CloudFront** for the browser hostname (`custom_domain`). Separate **`api.<domain>` DNS records toward an ALB are **not** used in this stack.

The **Destroy AWS** workflow uses the same `TF_*` values so destroy matches state.

## PR previews

The **Preview AWS** workflow creates a full temporary stack for each same-repository pull request and destroys it when the PR closes. Forked PRs are skipped so untrusted code cannot assume the AWS OIDC role.

Preview hostnames use **Variable** `TF_CUSTOM_DOMAIN`:

- Site: `pr-<number>.<TF_CUSTOM_DOMAIN>` (for example `pr-123.iacbuilder.michaelj43.dev`)

`/api/*` stays **same-origin** via CloudFront; there is **no separate `api-pr-*`** public hostname or Route 53 alias in this layout (the ACM cert should still include a wildcard that covers preview site names).

Required repository configuration:

- **Variable or Secret** `AWS_DEPLOY_ROLE_ARN`
- **Variable or Secret** `TF_STATE_BUCKET`
- **Variable** `TF_CUSTOM_DOMAIN`
- **Secret** `TF_ACM_CERTIFICATE_ARN`
- **Secret** `TF_ROUTE53_HOSTED_ZONE_ID`
- Optional **Variable** `AWS_REGION` (defaults to `us-east-1`)

Preview Terraform state is isolated per PR:

```bash
iac-builder/previews/pr-<number>/<region>/terraform.tfstate
```

Each preview also creates a GitHub Deployment environment named `preview-pr-<number>`. When the preview is live, the deployment status is marked `success` with the preview URL. On PR close, the workflow runs `terraform destroy`, removes the preview state object, marks matching GitHub deployments `inactive`, and then attempts to delete the dynamic GitHub environment. Environment deletion uses `GITHUB_TOKEN` first; if GitHub rejects that cleanup due to permissions, teardown still succeeds after logging a warning.

If your AWS OIDC trust currently only allows `repo:MichaelJ43/iac-builder:ref:refs/heads/main`, expand it before enabling previews. The preview deploy job uses dynamic GitHub environments, so the OIDC subject is expected to match `repo:MichaelJ43/iac-builder:environment:preview-pr-*`; keep the condition scoped to this repository.

## Undeploy

Run the **Destroy AWS** workflow (manual). Type `DELETE` in the `confirm` input. It runs `terraform destroy` for the same state key as deploy.

## Legacy ALB topology

The previous ALB-based Terraform is archived as **`deploy/terraform/aws/alb_lambda.tf.disabled`** (Terraform does not load `*.disabled`). Restoring it requires reconciling **`cloudfront.tf` / [`route53.tf`](../deploy/terraform/aws/route53.tf)** references and VPC/subnet data again—not supported by the checked-in defaults.

## Expanding to N regions

The Terraform root is parameterized with `var.aws_region` (default **us-east-1**). To add another region:

1. Use a **separate state key** per region (the GitHub workflow already keys state by `project_name` + `aws_region`).
2. Duplicate the deploy workflow inputs with the new region **or** add a matrix strategy once you are comfortable with parallel applies.
3. Add a **second AWS provider alias** in Terraform (e.g. `provider "aws" { alias = "usw2"; region = "us-west-2" }`) and instantiate the same module twice, **or** keep one stack per region in separate root directories—pick one approach and stick to it for state isolation.

Front-door options for multi-region users:

- **Route 53** latency records pointing at each regional CloudFront distribution.
- **AWS Global Accelerator** in front of regional endpoints if you need static anycast IPs (extra cost).

## Cost notes

- CloudFront + S3 for static assets is typically **pennies** at low traffic.
- **No ALB**: removes the dominant **fixed hourly** regional charge vs the old stack.
- Lambda Function URL itself has **no** separate hourly fee; you pay Lambda invoke + duration (256 MB baseline in Terraform).
- Lambda billing is **per invoke** + duration; keep memory right-sized (256 MB in Terraform as a starting point).
