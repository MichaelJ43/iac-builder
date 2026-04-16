# Future ideas and roadmap

This document captures **post-MVP** directions. For current behavior, see the root [`README.md`](../README.md).

## Authentication and multi-user

Full login (OIDC: Auth0, Cognito, Azure AD), per-user encrypted vaults, sessions, and rate limits for a hosted service.

## Cloud onboarding

SSO, assumed roles, workload identity from CI, and Azure Managed Identity for the application tier.

## More cloud providers

GCP, OCI, and others behind the same discovery abstraction used for AWS today.

## Non-cloud and hybrid

Kubernetes workload packaging, on-prem Ansible, VMware — prioritize if targeting platform or SRE roles.

## More IaC frameworks and deeper emitters

Complete emitters for CloudFormation, Pulumi, Bicep, and CDK beyond the MVP vertical slice; OpenTofu compatibility notes; Crossplane compositions.

## Security depth

Auto-generated least-privilege IAM policies, organization guardrails, CIS toggles, and integration with secrets managers.

## Wizard presets and catalogs

Shareable preset libraries, import/export, versioning, and a **quick-builder** catalog of popular application stacks.

## UX

Undo history, diffs between preset and current state, optional AI assist with strict policy controls.

## Operations

Hosted SaaS, telemetry (opt-in), multi-region API deployments.
