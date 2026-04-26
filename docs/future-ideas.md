# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / region** → **optional API credential profile** → **network & compute** → **saved API presets** (optional) → **security hints** and optional AI assist).

## Priority overview

| Priority | Theme | Summary |
|----------|--------|--------|
| **P1** | UX & Polish | In-app clarity (field order, help copy, loading/error states), **AI assist provider** behind explicit user action + rate limits + policy |
| **P2** | Security depth | Org guardrails, deeper CIS automation, first-class **Secrets Manager / SSM** wiring from the app (API hints and IAM policy JSON for instance roles are shipped) |
| **P3** | Presets & catalogs | Preset **versioning**, preset **naming/validation** UX, **quick-builder** stack catalog (library of common stacks) |
| **P4** | More frameworks / emitters | Full CloudFormation, Pulumi, Bicep, CDK; OpenTofu notes; Crossplane — MVP path is **Terraform**-first today |
| **P5** | Auth & multi-user for SaaS | OIDC (Auth0, Cognito, Azure AD), per-user encrypted vaults, **rate limits** for hosted service |
| **P6** | Cloud onboarding | SSO, assumed roles, workload identity (CI/IDP) |
| **P7** | More cloud providers | GCP, OCI, etc., behind a shared discovery abstraction |
| **P8** | Non-cloud & hybrid | K8s packaging, on-prem Ansible, VMware |
| **P9** | Operations | Hosted SaaS posture, **opt-in** telemetry, multi-region API |

---

## P1 — UX and polish (highest next focus)

**Shipped in-tree**  
- **Wizard column order:** framework → region → **optional** AWS profile (for discovery) → VPC / subnet / compute — with starter templates and **saved API presets** (save/load/diff/download/import-from-file) **below** the core path. This matches the header copy and puts shortcuts after the main path.  
- **Undo / redo**; **preset diff**; toolbar **import/export**; **combobox** fields for common IDs.  
- Build-flagged **AI assist policy** + JSON context preview only (`VITE_IAC_AI_ASSIST`, see [`ai-assist.md`](ai-assist.md)); no model calls by default.

**Still to build**  
- **AI:** optional provider + explicit “send” path, **rate limits**, product/legal review.  
- **Form UX / polish:** e.g. collapse **Saved API presets** into `<details>`, or a small “**Advanced**” region for presets; clearer distinction between “**Import configuration**” (replaces the live wizard) vs “**Create from JSON file**” (adds a server preset); field-level **validation** before preview; **skeleton/loading** for discovery rows when profile + region are set.

---

## P2 — Security depth

**Shipped:** [`/api/v1/security/recommendations`](security.md) with CIS-style tags, remediations, SSH CIDR, SG/key-pair nudges, instance IAM policy JSON, **`secrets-manager-app-runtime`**, and **`private-egress-endpoints`** hints when the wizard is complete.

**Still to build:** org-wide guardrails, deeper automated CIS, **live** Secrets Manager / Parameter Store integration from the app.

---

## P3 — Presets, catalogs, sharing

**Shipped (API + UI):** list/create/delete/apply; diff baseline; download v1 JSON; import JSON to create API preset; profile modal for keys.

**Still to build:** **versioning** (or snapshot labels), **quick-builder catalog** of reference stacks, optional **team/org** preset libraries, clearer **share** story (links vs files only).

---

## P4 — More IaC frameworks and emitters

Beyond the Terraform (and similar) **vertical slice** in gen: full emitters, OpenTofu compatibility notes, Crossplane.

---

## P5 — Authentication and multi-user

Current **shared-api-platform**-style session + per-user **SQLite** profiles are in place for hosted flows. **Broader** SaaS auth (Cognito, Auth0, Azure AD), org billing, and **abuse** controls remain roadmap.

---

## P6 — Cloud onboarding

SSO, assumed roles, identity from CI, Azure Managed Identity for app tier.

---

## P7 — More cloud providers

GCP, OCI, etc.

---

## P8 — Non-cloud and hybrid

Kubernetes packaging, on-prem Ansible, VMware.

---

## P9 — Operations

Hosted SaaS posture, **opt-in** telemetry, multi-region API deployments.
