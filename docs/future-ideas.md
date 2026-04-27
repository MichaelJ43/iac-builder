# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / region** → **optional API credential profile** → **network & compute** → **server presets** (optional) → **security hints** and optional AI assist).

## Priority overview (outstanding work only)

The table below lists **work that is not done yet**—not a history. When a row is finished, **remove it** from the table so the next priority stays visible. Shipped work lives in the **Completed** notes below, not in the table.

| Priority | Theme | What’s left |
|----------|--------|--------|
| **P2** | Security depth | More operator env policies, deeper automated CIS, **live** resource wiring to Secrets Manager / Parameter Store from the app. |
| **P3** | Presets & catalogs | **Versioning** (or labels), **quick-builder** stack catalog, optional team/**org** libraries. |
| **P4** | More frameworks / emitters | CloudFormation, Pulumi, Bicep, CDK, OpenTofu, Crossplane—beyond the current **Terraform**-oriented path. |
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

---

## P2 — Security depth

**Shipped (API + hints):** [`/api/v1/security/recommendations`](security.md) with CIS-style tags, remediations, SSH CIDR, SG/key-pair nudges, instance IAM policy JSON, **`secrets-manager-app-runtime`**, **`private-egress-endpoints`**, burstable instance **`burst-cpu-credits`**, and optional **preview** blocking via `IAC_BLOCK_SSH_OPEN_WORLD` (see [Operator guardrails](security.md#operator-guardrails-self-hosted)).

**Still to build:** match the P2 row in the table (additional env policies, deeper CIS, live SM/SSM from the app).

---

## P3 — Presets, catalogs, sharing

**Shipped (API + UI):** list/create/delete/apply; diff; download/import JSON; profile modal; layout + hints.

**Still to build:** match the P3 row in the table.

---

## P4 — More IaC frameworks and emitters

Full emitters, OpenTofu notes, Crossplane—beyond the current **Terraform**-oriented path (see the P4 row in the table).

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
