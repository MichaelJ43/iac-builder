# Security model (MVP)

## Credential profiles

AWS access keys are stored **encrypted at rest** in SQLite using **AES-256-GCM** with a key derived from `IAC_MASTER_KEY` (64 hex characters = 32 bytes). They are **never** stored in plaintext in the database, never returned in list APIs, and are not logged. When **session auth** is enabled, profiles are also scoped to the authenticated user id from **shared-api-platform**; login and session management remain on that platform—this app only calls `GET` on the platform’s auth endpoint to verify identity and scope rows.

This is appropriate for **local development and portfolio demos**. It is **not** a substitute for:

- OIDC / IAM Identity Center for humans
- IAM roles for workloads (IRSA, instance profiles with least privilege)
- Short-lived credentials via `sts:AssumeRole`

## Operator guardrails (self-hosted)

The API can enforce **org-style** policy for everyone using your deployment via environment variables (no per-tenant store yet). Truthy values are `1`, `true`, `yes`, and `on` (case-insensitive). **`GET /api/v1/operator/guards`** returns a JSON object describing which of these are active (no secrets)—use it to confirm a deployment’s flags.

| Variable | Effect on `POST /api/v1/preview` |
|----------|----------------------------------|
| `IAC_BLOCK_SSH_OPEN_WORLD` | **400** if `ssh_cidr` is `0.0.0.0/0` or `::/0` (tighten CIDR; hints still list `ssh-open-world` when the guard is off). |
| `IAC_REQUIRE_IMDSV2` | **400** if “Require IMDSv2” is not enabled. |
| `IAC_REQUIRE_EBS_ENCRYPTION` | **400** if “Encrypt root EBS” is not enabled. |
| `IAC_BLOCK_ASSOCIATE_PUBLIC_IP` | **400** if “Associate public IP” is on. |

Unset these in local development when you need looser values for learning or tests.

## Application runtime secrets in generated Terraform

Optional wizard fields (names only, never secret values) wire **existing** resources:

- `app_secretsmanager_secret_name` — emits `data "aws_secretsmanager_secret" "app_sm"`.
- `app_ssm_parameter_name` — emits `data "aws_ssm_parameter" "app_ssm"`.

You must still attach an **instance profile** with IAM that allows `secretsmanager:GetSecretValue` and/or `ssm:GetParameter` (and `kms:Decrypt` when using CMKs), and you must not put secret *values* in `user_data` or tags. **CloudFormation** output adds comments with the same names for hand-wiring; it does not add full `Resources` for secrets to avoid duplicating your account’s secret layout in a generic template.

This is a **host-level** and **IaC-level** control. It does not replace your own network, IAM, or rotation policies.

## Operational guidance

- Scope IAM policies to **read-only** EC2 describe APIs for discovery.
- Never commit `IAC_MASTER_KEY` or raw credentials to git.
- The API avoids logging secret material and returns generic errors where possible.
