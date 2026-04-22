# Future ideas and roadmap

This document captures **post-MVP** directions. For current behavior, see the root [`README.md`](../README.md).

Items are ordered by **recommended delivery priority** for this repository (impact on the guided wizard, feasibility, and dependencies). Revisit the order when product goals shift.

## Priority overview

| Priority | Theme | Summary |
|----------|--------|--------|
| **P1** | UX | Optional AI assist behind strict policy (undo/redo and preset diff are shipped) |
| **P2** | Security depth | Org guardrails, deeper CIS automation, secrets manager **integrations** (starter hints + IAM JSON in API are shipped) |
| **P3** | Wizard presets and catalogs | Shareable presets, import/export, versioning, quick-builder stack catalog (API presets exist; UI and workflows still thin) |
| **P4** | More IaC frameworks and deeper emitters | Full CloudFormation, Pulumi, Bicep, CDK emitters; OpenTofu notes; Crossplane compositions |
| **P5** | Authentication and multi-user | OIDC (Auth0, Cognito, Azure AD), per-user encrypted vaults, sessions, rate limits for a hosted service |
| **P6** | Cloud onboarding | SSO, assumed roles, workload identity from CI, Azure Managed Identity for the app tier |
| **P7** | More cloud providers | GCP, OCI, and others behind the same discovery abstraction used for AWS today |
| **P8** | Non-cloud and hybrid | Kubernetes packaging, on-prem Ansible, VMware — prioritize if targeting platform or SRE roles |
| **P9** | Operations | Hosted SaaS posture, opt-in telemetry, multi-region API deployments |

---

## P1 — UX

**Shipped in-tree:** build-flagged optional AI assist **policy** surface + JSON context preview only (`VITE_IAC_AI_ASSIST`, see [`docs/ai-assist.md`](ai-assist.md)); no model calls by default. Undo/redo and preset diff also shipped (see table).

**Still to build:** a provider integration behind explicit user action, rate limits, and product policy review.

## P2 — Security depth

Shipped: richer `/api/v1/security/recommendations` (CIS-style tags, remediations, broad SSH CIDR checks, missing security groups, key-pair guidance, starter IAM policy JSON for instance roles). When the wizard has a complete compute step (subnet, instance type, AMI), an additional **`secrets-manager-app-runtime`** info hint nudges **application** secrets to AWS Secrets Manager or SSM Parameter Store with least-privilege IAM; when the instance has **no public IP**, a **`private-egress-endpoints`** info hint calls out **NAT and/or VPC endpoints** (SSM, S3) so private subnets stay operable.

Still to build: organization-wide guardrails, automated CIS baselines beyond deeper hints, and first-class *automated* integrations (e.g. live Secrets Manager / Parameter Store resource wiring from the app).

## P3 — Wizard presets and catalogs

Shareable preset libraries, import/export, versioning, and a **quick-builder** catalog of popular application stacks.

## P4 — More IaC frameworks and deeper emitters

Complete emitters for CloudFormation, Pulumi, Bicep, and CDK beyond the MVP vertical slice; OpenTofu compatibility notes; Crossplane compositions.

## P5 — Authentication and multi-user

Full login (OIDC: Auth0, Cognito, Azure AD), per-user encrypted vaults, sessions, and rate limits for a hosted service.

## P6 — Cloud onboarding

SSO, assumed roles, workload identity from CI, and Azure Managed Identity for the application tier.

## P7 — More cloud providers

GCP, OCI, and others behind the same discovery abstraction used for AWS today.

## P8 — Non-cloud and hybrid

Kubernetes workload packaging, on-prem Ansible, VMware — prioritize if targeting platform or SRE roles.

## P9 — Operations

Hosted SaaS, telemetry (opt-in), multi-region API deployments.
