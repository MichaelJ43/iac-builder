# AWS setup walkthrough (committed copy)

This is the **same** step-by-step guide as the repo-root file **`AWS_SETUP_WALKTHROUGH.local.md`**, which is **gitignored** so you can paste account-specific values there without committing them.

- **To use locally:** copy this file to the repo root as `AWS_SETUP_WALKTHROUGH.local.md` and fill in the tables / notes.
- **Technical reference:** [`docs/aws-deploy.md`](aws-deploy.md).

---

## 0. What you need before you start

- An **AWS account** where you are allowed to create IAM roles, S3 buckets, Lambda, ALB, and CloudFront.
- **AWS CLI** installed locally (optional but useful for sanity checks): [Installing the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
- **Admin access** to the **GitHub repo** (to add Actions secrets and run workflows).

---

## 1. Pick names (write them down)

| Item | Example | Your value |
|------|---------|--------------|
| AWS region | `us-east-1` | |
| Terraform state bucket (globally unique) | `myname-tfstate-us-east-1` | |
| GitHub repo | `MichaelJ43/iac-builder` | |

The workflows default **`project_name`** to `iac-builder`; change the workflow input only if you want a different resource prefix.

---

## 2. Create the S3 bucket for Terraform state

1. Sign in to the **AWS Console** → Region **N. Virginia (us-east-1)**.
2. Open **S3** → **Create bucket**.
3. **Bucket name**: use the name you picked (must be globally unique).
4. **Region**: **US East (N. Virginia) us-east-1**.
5. Under **Bucket Versioning**, turn **Enable** on (recommended for state recovery).
6. Leave other defaults or turn on **Default encryption** (SSE-S3 is fine).
7. **Create bucket**.

You will store this bucket name as the GitHub secret **`TF_STATE_BUCKET`** in step 6.

---

## 3. Add the GitHub OIDC provider in IAM (one-time per account)

Skip this subsection if the provider already exists (common if you have used GitHub Actions + AWS before).

1. AWS Console → **IAM** → **Identity providers** → **Add provider**.
2. **Provider type**: **OpenID Connect**.
3. **Provider URL**: `https://token.actions.githubusercontent.com`
4. **Audience**: `sts.amazonaws.com` (some consoles label this “Audience”; it must match the trust policy below).
5. **Add provider**.

If AWS says the provider already exists, you are done with this step.

---

## 4. Create the IAM role GitHub Actions will assume

### 4a. Trust policy (who can assume the role)

1. IAM → **Roles** → **Create role**.
2. **Trusted entity type**: **Web identity**.
3. **Identity provider**: `token.actions.githubusercontent.com` (the OIDC provider from step 3).
4. **Audience**: `sts.amazonaws.com`.
5. **GitHub organization and repository** (if the wizard offers it): your org/user and repo, e.g. `MichaelJ43` / `iac-builder`.  
   If the console does not offer fine-grained GitHub fields, continue and paste the JSON below under **Custom trust policy** instead.

**Custom trust policy** (replace `MichaelJ43/iac-builder` if needed). This allows **only the `main` branch** to assume the role; tighten or loosen the `sub` condition as you prefer (e.g. `repo:ORG/REPO:*` for all refs — broader risk).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:MichaelJ43/iac-builder:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Replace **`YOUR_ACCOUNT_ID`** with your 12-digit AWS account ID (IAM dashboard top right, or **Support** → **Account**).

### 4b. Permissions (what the role can do)

Terraform needs broad rights the first time you stand this stack up.

- **Simple / lab**: attach **`AdministratorAccess`** (fastest; narrow later).
- **Stricter**: start from **PowerUserAccess** and add **IAM** permissions Terraform needs to create roles and pass them to Lambda; expect trial-and-error unless you use a pre-scoped policy.

Finish **Create role**. Copy the role’s **ARN** (looks like `arn:aws:iam::123456789012:role/...`). You will use it as **`AWS_DEPLOY_ROLE_ARN`** in step 6.

---

## 5. (Optional) Validate OIDC from your laptop

Not required, but useful if something fails in GitHub:

```bash
aws sts get-caller-identity
```

That only proves your **user** credentials. OIDC is exercised only inside GitHub Actions. If deploy fails with **assume role** errors, re-check step 4 trust policy `sub` and `aud`.

---

## 6. Add GitHub repository secrets or variables

1. GitHub → your repository → **Settings** → **Secrets and variables** → **Actions**.
2. Under **Variables** *or* **Secrets**, create (names must match exactly):
   - **`TF_STATE_BUCKET`** — S3 bucket **name** from step 2 (not an ARN). A **Variable** is fine (not secret material).
   - **`AWS_DEPLOY_ROLE_ARN`** — full IAM role ARN from step 4. Prefer a **Secret** on public repositories (Variables are visible to anyone who can read the repo).
3. The workflows use `secrets.* || vars.*` for each name; if both are set, the **Secret** wins.

No other configuration is required for the stock workflows.

---

## 7. Run **Deploy AWS** (first deploy)

1. GitHub → **Actions**.
2. Select **Deploy AWS (S3 + CloudFront + ALB + Lambda)** in the left list.
3. **Run workflow** (right side).
4. Inputs:
   - **aws_region**: `us-east-1` (default).
   - **project_name**: `iac-builder` unless you want a different prefix.
5. **Run workflow**.

Watch the job:

- **Build Lambda zip** — compiles Go for **linux/arm64**.
- **Terraform init / apply** — creates S3 UI bucket, CloudFront, ALB, Lambda, etc.
- **Build UI** — `npm ci` + `npm run build`.
- **Sync UI to S3** — uploads `dist/`.
- **Invalidate CloudFront** — `/*`.
- **Print app URL** — logs `https://<cloudfront-domain>`.

Open that URL in a browser. The UI should load; `/api/v1/version` should hit the API through CloudFront.

### Common failures

| Symptom | What to check |
|---------|----------------|
| `Could not assume role` | Trust policy `sub` matches how GitHub identifies the ref (`refs/heads/main` vs tags, etc.). |
| `AccessDenied` on S3 state bucket | Role can `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on the state bucket (AdministratorAccess covers this). |
| Terraform subnet / ALB error | Default VPC must have **at least two subnets** in **us-east-1** (two AZs). |
| CloudFront 503 to API | ALB security group / target group / Lambda permission; re-run apply after fixing. |

---

## 8. Redeploy after code changes

Run **Deploy AWS** again with the same **project_name** and **aws_region** so Terraform uses the **same state key** and updates in place. The workflow rebuilds Lambda, reapplies Terraform (if resources changed), re-syncs the UI, and invalidates CloudFront.

---

## 9. Run **Destroy AWS** (full teardown)

1. **Actions** → **Destroy AWS stack**.
2. **Run workflow**.
3. Set **confirm** to exactly: **`DELETE`** (case-sensitive).
4. Same **aws_region** and **project_name** you used for deploy (so the state key matches).

Terraform destroys resources in dependency order. Empty the state bucket separately only if you want to delete **history** of this stack (optional).

---

## 10. Adding another region later (outline)

1. Run **Deploy AWS** again with **`aws_region`** = e.g. `us-west-2` (and the same or different `project_name` per your convention).  
   State is stored under a **different key** automatically: `iac-builder/<project>/<region>/terraform.tfstate`.
2. In Terraform, you can later introduce a **second `provider "aws"` alias** and duplicate modules; see [`docs/aws-deploy.md`](aws-deploy.md).
3. For one hostname across regions, plan **Route 53** (latency routing) or **Global Accelerator** in front of regional CloudFront distributions.

---

## 11. Security hygiene for the gitignored copy

- Keep **`AWS_SETUP_WALKTHROUGH.local.md`** in `.gitignore` if you paste real ARNs or internal URLs there.
- If you ever **did** commit secrets, rotate the affected IAM keys or roles and use `git filter-repo` or GitHub support to purge history (treat as incident).

---

## Quick secret checklist

- [ ] `TF_STATE_BUCKET` = state bucket **name**
- [ ] `AWS_DEPLOY_ROLE_ARN` = IAM role **ARN**
- [ ] OIDC trust `sub` matches your repo and branch strategy
- [ ] Default VPC has ≥ 2 subnets in **us-east-1**
