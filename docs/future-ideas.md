# Future ideas and roadmap

This document captures **post-MVP** and **in-flight** product directions. For current behavior, see the root [`README.md`](../README.md) and the main wizard column in [`src/ui/src/App.tsx`](../src/ui/src/App.tsx) (intended read order: starter shortcuts → **framework / region** → **optional API credential profile** → **network & compute** → **server presets** (optional) → **security hints** and optional AI assist).

## Priority overview

| Priority | Theme | Summary |
|----------|--------|--------|
| **P1** | UX & Polish | **Field validation** before preview; **AI assist** provider + rate limits + policy |
| **P2** | Security depth | Org guardrails, deeper CIS automation, first-class **Secrets Manager / SSM** wiring (API hints + instance IAM JSON shipped) |
| **P3** | Presets & catalogs | **Versioning** / labels, **quick-builder** stack catalog, optional **org** libraries |
| **P4** | More frameworks / emitters | CloudFormation, Pulumi, Bicep, CDK; OpenTofu; Crossplane — **Terraform**-first today |
| **P5** | Auth & multi-user (SaaS) | Broader IdP, billing, **rate limits** (platform session + per-user DB profiles exist) |
| **P6** | Cloud onboarding | SSO, assumed roles, CI workload identity |
| **P7** | More cloud providers | GCP, OCI, shared discovery shape |
| **P8** | Non-cloud & hybrid | K8s, Ansible, VMware |
| **P9** | Operations | **Opt-in** telemetry, multi-region API |

---

## P1 — UX and polish (current focus)

**Shipped in-tree**  
- **Wizard read order** and **header** copy: framework → region → **optional** profile → network & compute, with **starters** and **server presets** (collapsible) after the main path.  
- **Toolbar hint** (Import vs **Create from JSON** for server presets), **import/export** / undo / comboboxes.  
- **AWS discovery loading:** `useAwsDiscovery` exposes `loading` / `loadingSubnets` with a short **help** line and `aria-busy` / subtle styling on comboboxes while read-only lists refresh.  
- Build-flagged **AI assist** policy + JSON context preview only (`VITE_IAC_AI_ASSIST`); no model calls by default. See [`ai-assist.md`](ai-assist.md).

**Next up**  
- **Client-side validation** before code preview: required fields, basic format checks, inline messages (keeps bad state from hitting `/api/v1/preview` when obviously incomplete).  
- **AI (optional):** explict provider + user-triggered “send” path, **rate limits**, product/legal sign-off.

---

## P2 — Security depth

**Shipped:** [`/api/v1/security/recommendations`](security.md) with CIS-style tags, remediations, SSH CIDR, SG/key-pair nudges, instance IAM policy JSON, **`secrets-manager-app-runtime`**, **`private-egress-endpoints`**.

**Still to build:** org-wide guardrails, deeper automated CIS, **live** resource wiring to Secrets Manager / Parameter Store from the app.

---

## P3 — Presets, catalogs, sharing

**Shipped (API + UI):** list/create/delete/apply; diff; download/import JSON; profile modal; layout + hints.

**Still to build:** **versioning** (or snapshot labels), **quick-builder catalog**, optional team/org sharing.

---

## P4 — More IaC frameworks and emitters

Full emitters, OpenTofu notes, Crossplane — beyond the current **Terraform**-oriented path.

---

## P5 — Authentication and multi-user

**Current:** platform session, per-user encrypted profiles in **SQLite** for hosted deploys. **Broader** SaaS (Cognito, Auth0, etc.), org billing, abuse controls.

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

Hosted posture, **opt-in** telemetry, multi-region API.
