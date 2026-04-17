# AGENTS.md — AI and contributor context

Read this file at the start of substantive work on this repository, and refresh it when architecture, testing, or release rules change.

## What this is

**iac-builder** is a learning and portfolio project: a containerized **Go API** plus **React (Vite) UI** that guides users through generating **IaC** for a narrow MVP path (**AWS EC2**), with optional **encrypted credential profiles** for discovery (VPC/subnet lists), **wizard presets**, **rule-based security hints**, and a **live code preview** panel.

## Layout

- Application code: [`src/api`](src/api) (Go module `github.com/MichaelJ43/iac-builder/api`), [`src/ui`](src/ui) (TypeScript + React).
- Automated tests: [`test/component`](test/component) (Go black-box HTTP tests), [`test/unit/ui`](test/unit/ui) (Vitest), [`test/ui`](test/ui) (Playwright). Go unit tests live next to packages under `src/api` (standard Go layout); TypeScript tests stay under `test/` per project conventions.
- Docs: [`docs`](docs). Roadmap: [`docs/future-ideas.md`](docs/future-ideas.md).

## How to run tests

From the repo root:

```bash
make test
```

Or individually:

- `cd src/api && GOSUMDB=off go test ./...`
- `cd test/component && GOSUMDB=off go test ./...`
- `cd test/unit/ui && npm ci && npm test`
- `cd test/ui && npm ci && npx playwright install chromium && npm test` (set `CI=true` for non-interactive).

## Test coverage expectations

These rules apply to **new or materially changed** behavior (not drive-by refactors of unrelated code).

### Go (`src/api`)

- Aim for **at least 80% statement coverage** on each **package you modify** (same module subtree). Run, for example:  
  `cd src/api && GOSUMDB=off go test ./internal/<pkg> -cover`  
  and add focused table-driven tests until the package meets the bar. If a change is trivially exercised only through another package, note that in the PR description.

### HTTP component tests (`test/component`)

- When you change **HTTP routes, handlers, status codes, or JSON shapes** exposed under `/api/v1/`, extend the black-box tests in [`test/component`](test/component) so the new or updated behavior is asserted end-to-end against a running server (or the same harness the package tests use).

### UI (`src/ui`)

- For **new or updated** TypeScript/React under [`src/ui/src`](src/ui/src), keep **at least 80% line coverage** on the **files you touch**, using Vitest from [`test/unit/ui`](test/unit/ui) (`npm test -- --coverage` when coverage is configured there).
- Add **Vitest + React Testing Library** tests for **user-visible** behavior of those features (treat these as UI component tests). Pure helpers can rely on unit tests only; interactive flows should use RTL (`render`, `userEvent`, `waitFor`, etc.) as appropriate.

### Playwright (`test/ui`)

- Use for **critical smoke / cross-browser** journeys; not every small UI tweak requires a new Playwright spec if RTL already covers the behavior.

## Semver and releases

- The canonical semantic version lives in the repo-root **[`VERSION`](VERSION)** file (e.g. `0.1.0`).
- **Pull request titles** drive automated bumps when a PR is **merged into `main`**: include **exactly one** of the following tokens in the PR title so the release workflow can parse it:
  - `+(semver:major)` — increment MAJOR, reset MINOR and PATCH to 0.
  - `+(semver:minor)` — increment MINOR, reset PATCH to 0.
  - `+(semver:patch)` — increment PATCH (this is the default if no token is present).
- The workflow runs [`scripts/bump_version.py`](scripts/bump_version.py), commits the updated `VERSION`, creates an annotated git tag `vX.Y.Z`, and pushes to `main` and tags.
- **Contributors:** put the semver token in the PR title when you intend a version bump; reviewers should confirm it matches the change magnitude.

## Security notes

- `IAC_MASTER_KEY` must be **64 hex characters** (32 bytes) for AES-256-GCM encryption of stored AWS keys. Suitable for **local/dev**; production should use OIDC/short-lived credentials.
- Never log credentials or echo them in errors.

## OpenAPI

Hand-maintained API contracts are described in user docs; the UI calls JSON endpoints under `/api/v1/`.

## AWS serverless (optional)

Terraform and GitHub Actions workflows under [`deploy/terraform/aws`](deploy/terraform/aws) and [`.github/workflows/deploy-aws.yml`](.github/workflows/deploy-aws.yml) deploy the UI to **S3** behind **CloudFront**, and the API to **Lambda** behind an **ALB**, with **us-east-1** as the default region. See [`docs/aws-deploy.md`](docs/aws-deploy.md).
