# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / region** → **optional API credential profile** → **network & compute** → **server presets** (optional) → **security hints** and optional AI assist).

## Priority overview (outstanding work only)

The table below lists **work that is not done yet**—not a history. When a row is finished, **remove it** from the table so the next priority stays visible. Shipped work lives in the **Completed** notes below, not in the table.

| Priority | Theme | What’s left |
|----------|--------|--------|
| **P5** | Auth & multi-user (SaaS) | Broader IdP, billing, abuse controls. |
| **P6** | Cloud onboarding | SSO, assumed roles, identity from CI, workload identity. |
| **P7** | More cloud providers | GCP, OCI, shared discovery shape. |
| **P8** | Non-cloud & hybrid | Kubernetes packaging, on-prem Ansible, VMware. |
| **P9** | Operations | Hosted posture, **opt-in** telemetry, multi-region API. |

*Maintainers: delete a row when its “What’s left” is empty.*

### Completed — P1 (UX & polish)

The **P1** UX track is considered **complete** for this repo: wizard polish, validation, discovery loading, and **optional AI assist** with **BYOK** (each user stores their own OpenAI API key encrypted server-side; the **hosting operator does not fund** model usage). See [`ai-assist.md`](ai-assist.md) for routes, env, and policy. **Product / legal** review is an **operator responsibility** before production use (subprocessor, terms, regional rules).

- **Wizard read order**, header, toolbar, import/export, undo, comboboxes, starters, presets (as shipped).  
- **AWS discovery loading** (`loading` / `loadingSubnets`, `aria-busy`).  
- **Client-side validation** before preview (aligned with API `Validate()` + format hints).  
- **AI assist (build-flagged):** `GET/PUT/DELETE /api/v1/ai/openai-key`, `POST /api/v1/ai/assist`, per-IP rate limit, OpenAI BYOK via `IAC_OPENAI_MODEL` / `IAC_OPENAI_BASE_URL` (optional).

### Completed — P2 (Security depth)

The **P2** security track is considered **complete** for this repo at the current scope: **operator env guardrails** for preview, **deeper CIS-style** recommendations, and **live wiring** of existing Secrets Manager / SSM parameters into **Terraform** (data sources) plus **CloudFormation** comments, with optional wizard fields and [`GET /api/v1/operator/guards`](security.md#operator-guardrails-self-hosted).

- **Preview guardrails** (all opt-in via `IAC_*`): `IAC_BLOCK_SSH_OPEN_WORLD`, `IAC_REQUIRE_IMDSV2`, `IAC_REQUIRE_EBS_ENCRYPTION`, `IAC_BLOCK_ASSOCIATE_PUBLIC_IP`. See [Operator guardrails](security.md#operator-guardrails-self-hosted).
- **Hints:** e.g. **`vpc-id-missing`**, **`ebs-cmk-consider`**, **`burst-cpu-credits`**, **`secret-ref-data-source`** when app secret names are set; see [`/api/v1/security/recommendations`](security.md).
- **Generated IaC:** optional `app_secretsmanager_secret_name` / `app_ssm_parameter_name` on `WizardState` → Terraform `data` sources `app_sm` / `app_ssm`; root EBS uses **gp3** when encryption is on. CloudFormation emits **guidance comments** for the same names.

### Completed — P3 (Presets and catalogs)

The **P3** presets/catalog track is **complete** for this repo at the current scope: **preset format_version + labels** (v1 JSON envelope, optional `IAC_DEFAULT_PRESET_LABELS` merge), a larger **tagged quick-builder (starter) catalog** with in-UI tag filtering, and **org-style libraries** via shared label conventions plus env defaults. See [`presets-and-catalog.md`](presets-and-catalog.md).

### Completed — P4 (More frameworks / emitters)

The **P4** track is **complete** for this repo at the current scope: the wizard can emit **OpenTofu** (HCL, Terraform-shaped), **Pulumi** (TypeScript), **AWS CDK** (v2 TypeScript, L1 EC2), **Azure Bicep** (syntactically valid placeholder that explains the app is AWS-EC2–centric), and **Crossplane** (Upbound `ec2.aws` Instance), alongside existing **Terraform** and **CloudFormation** targets.

---

## P2 — Security depth (reference)

**Shipped:** see **Completed — P2** above. Use this section as a pointer for links that still say “P2”.

---

## P3 — Presets, catalogs, sharing (reference)

**Shipped:** see **Completed — P3** above.

---

## P4 — More IaC frameworks and emitters (reference)

**Shipped:** see **Completed — P4** above.

---

## P5 — Authentication and multi-user

**Current in-tree:** platform session, per-user encrypted profiles in **SQLite** for hosted deploys.

**Still to build:** see the P5 row in the table (broader IdP, billing, abuse controls).

---

## P6 — Cloud onboarding

SSO, assumed roles, identity from CI, Azure Managed Identity for app tier. See the P6 row in the table.

---

## P7 — More cloud providers

GCP, OCI, etc. See the P7 row in the table.

---

## P8 — Non-cloud and hybrid

Kubernetes packaging, on-prem Ansible, VMware. See the P8 row in the table.

---

## P9 — Operations

Hosted posture, **opt-in** telemetry, multi-region API. See the P9 row in the table.
