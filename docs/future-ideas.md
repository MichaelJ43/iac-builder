# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / region** → **optional API credential profile** → **network & compute** → **server presets** (optional) → **security hints** and optional AI assist).

## Priority overview (outstanding work only)

The table below lists **work that is not done yet**—not a history. When a row is finished, **remove it** from the table (and shrink or drop the matching section) so the next priority stays visible. Shipped work lives in the **Shipped in-tree** / **Completed** notes below, not in the table.

| Priority | Theme | What’s left |
|----------|--------|--------|
| **P1** | UX & Polish | **AI assist (optional):** LLM **provider** + server-side keys; product/**legal** sign-off. |
| **P2** | Security depth | Org-wide guardrails, deeper automated CIS, **live** resource wiring to Secrets Manager / Parameter Store from the app. |
| **P3** | Presets & catalogs | **Versioning** (or labels), **quick-builder** stack catalog, optional team/**org** libraries. |
| **P4** | More frameworks / emitters | CloudFormation, Pulumi, Bicep, CDK, OpenTofu, Crossplane—beyond the current **Terraform**-oriented path. |
| **P5** | Auth & multi-user (SaaS) | Broader IdP, billing, abuse controls. |
| **P6** | Cloud onboarding | SSO, assumed roles, identity from CI, workload identity. |
| **P7** | More cloud providers | GCP, OCI, shared discovery shape. |
| **P8** | Non-cloud & hybrid | Kubernetes packaging, on-prem Ansible, VMware. |
| **P9** | Operations | Hosted posture, **opt-in** telemetry, multi-region API. |

*Maintainers: when a row’s “What’s left” is empty, delete that row. When **P1** is empty, remove the P1 section below; the first row should then be **P2** if any P2 work remains.*

---

## P1 — UX and polish

**Not done (same as the table).**  
- **AI assist (optional):** real **LLM** provider, server-side key handling, product/legal sign-off.  
  **Shipped for this area:** `POST /api/v1/ai/assist` with v1 context validation, per-IP rate limit (`IAC_AI_ASSIST_RPM`), stub response; UI “Get AI suggestions” is user-triggered after policy checkbox.

**Shipped in-tree (reference—do not copy back into the priority table).**  
- **Wizard read order** and **header** copy: framework → region → **optional** profile → network & compute, with **starters** and **server presets** (collapsible) after the main path.  
- **Toolbar hint** (Import vs **Create from JSON** for server presets), **import/export** / undo / comboboxes.  
- **AWS discovery loading:** `useAwsDiscovery` exposes `loading` / `loadingSubnets` with a short **help** line and `aria-busy` / subtle styling on comboboxes while read-only lists refresh.  
- **Client-side validation** before preview: required fields aligned with the API’s `Validate()`, inline `aria-invalid` / error text, optional format checks (SSH CIDR, security group ids, subnet/AMI prefixes when clearly wrong). Skips `/api/v1/preview` and security fetch when invalid.  
- Build-flagged **AI assist** area (`VITE_IAC_AI_ASSIST`); policy + JSON preview + user-triggered API call (see above). No third-party model in default deployments. See [`ai-assist.md`](ai-assist.md).

---

## P2 — Security depth

**Shipped (API + hints):** [`/api/v1/security/recommendations`](security.md) with CIS-style tags, remediations, SSH CIDR, SG/key-pair nudges, instance IAM policy JSON, **`secrets-manager-app-runtime`**, **`private-egress-endpoints`**, and related API-suggested wiring.

**Still to build:** match the P2 row in the table (guardrails, deeper CIS, live SM/SSM from the app).

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
