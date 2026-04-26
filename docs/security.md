# Security model (MVP)

## Credential profiles

AWS access keys are stored **encrypted at rest** in SQLite using **AES-256-GCM** with a key derived from `IAC_MASTER_KEY` (64 hex characters = 32 bytes). They are **never** stored in plaintext in the database, never returned in list APIs, and are not logged. When **session auth** is enabled, profiles are also scoped to the authenticated user id from **shared-api-platform**; login and session management remain on that platform—this app only calls `GET` on the platform’s auth endpoint to verify identity and scope rows.

This is appropriate for **local development and portfolio demos**. It is **not** a substitute for:

- OIDC / IAM Identity Center for humans
- IAM roles for workloads (IRSA, instance profiles with least privilege)
- Short-lived credentials via `sts:AssumeRole`

## Operational guidance

- Scope IAM policies to **read-only** EC2 describe APIs for discovery.
- Never commit `IAC_MASTER_KEY` or raw credentials to git.
- The API avoids logging secret material and returns generic errors where possible.
