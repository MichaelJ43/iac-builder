# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / cloud / region** → **optional API credential profile (AWS discovery)** → **network & compute** → **server presets** (optional) → **security hints** and optional AI assist).

## Priority overview (outstanding work only)

The table below lists **work that is not done yet**—not a history. When a row is finished, **remove it** from the table so the next priority stays visible. Shipped work lives in the **Completed** notes below, not in the table.

| Priority | Theme | What’s left |
|----------|--------|--------|
| **P9** | Operations | Hosted posture, **opt-in** telemetry, multi-region API. |

*Maintainers: delete a row when its “What’s left” is empty.*

**P5 and P6** are not in-repo priorities; they are captured only under [**Commercialization Plan**](#commercialization-plan-out-of-scope) (out of scope for this project).

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

### Completed — P7 (More cloud providers)

The **P7** track is **complete** for this repo at the current scope: the wizard can target **AWS**, **Google Cloud**, or **Oracle Cloud**; **Terraform / OpenTofu** on GCP and OCI emit **starter** `main.tf` (not full parity with the AWS emitters). **Credential profiles remain AWS-only** for read-only API discovery. The API exposes a **cloud-neutral discovery JSON** (`/api/v1/profiles/{id}/discovery/...`) for networks, subnets, security groups, and images—**fully wired for AWS**, with `status: unavailable` and guidance for GCP/OCI until provider credentials exist.

### Completed — P8 (Non-cloud & hybrid)

The **P8** track is **complete** for this repo at the current scope: the wizard can target **Kubernetes** (`k8s`), **Ansible (on-prem)** (`ansible`), or **VMware vSphere** (`vmware`) alongside the public clouds. **Terraform / OpenTofu** emit **starter** artifacts: Kubernetes **Deployment** + **Service** under `k8s/`, **Ansible** `playbook.yml` + `inventory.ini`, and **vSphere** `main.tf` (OpenTofu gets the same header as other HCL). **Other frameworks** (Pulumi, CDK, etc.) are not implemented for these targets and return a clear error, matching GCP/OCI. **Discovery** remains `status: unavailable` with manual entry. See **P8** reference below.

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

## Commercialization Plan (out of scope)

This section records a **product roadmap shape** for a commercial, multi-tenant service. **This repository will not implement or track P5 / P6 as active work**—they are listed here for clarity about what a full SaaS might include beyond the current learning/portfolio scope.

| Label | Theme | What a commercial product might pursue |
|-------|--------|----------------------------------------|
| **P5** | Auth & multi-user (SaaS) | Broader IdP, billing, abuse controls. |
| **P6** | Cloud onboarding | SSO, assumed roles, identity from CI, workload identity, Azure Managed Identity for app tier, etc. |

**Already in this repo (not “done P5”):** platform session, per-user encrypted **AWS** profiles in **SQLite** on hosted deploys remain the supported baseline; that does *not* commit the project to IdP, billing, or the rest of a commercialization stack.

---

## P7 — More cloud providers (reference)

**Shipped:** see **Completed — P7** above.

---

## P8 — Non-cloud and hybrid (reference)

**Shipped:** see **Completed — P8** above. Wizard `cloud` values: `k8s`, `ansible`, `vmware`. Preview uses the same required fields (region, subnet, instance type, image) with **labels** in the UI tailored to each target.

---

## P9 — Operations

Hosted posture, **opt-in** telemetry, multi-region API. See the P9 row in the table.
