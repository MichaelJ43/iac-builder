# iac-builder

Guided **Infrastructure as Code** generator with a **React** wizard, **Go** API, optional **AWS** credential profiles (encrypted) for VPC/subnet discovery, and a **code preview** drawer.

## Prerequisites

- **Go** 1.22+
- **Node.js** 20+ and npm
- **Docker** + Docker Compose (for containerized runs)
- **Playwright** browsers (installed via `npx playwright install chromium` under `test/ui`)

## Quick start (local)

1. Export a master key (64 hex chars, 32 bytes):

   ```bash
   export IAC_MASTER_KEY=0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20
   ```

2. API (from `src/api`):

   ```bash
   mkdir -p data
   export SQLITE_DSN="file:./data/app.sqlite?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
   export APP_VERSION=$(cat ../../VERSION | tr -d '\n')
   go run ./cmd/iac-builder-api
   ```

3. UI (from `src/ui`):

   ```bash
   npm install
   npm run dev
   ```

Open the UI, complete the wizard, and use **Show code** for the live preview. API is proxied on `/api` in dev.

## Docker Compose

```bash
export IAC_MASTER_KEY=... # 64 hex chars
export APP_VERSION=$(cat VERSION | tr -d '\n')
docker compose up --build
```

- API: `http://localhost:8080`
- UI: `http://localhost:8081` (nginx proxies `/api` to the API)

## Tests

```bash
make test
```

## Semver automation

See **[`AGENTS.md`](AGENTS.md)** — merged PR titles may include `+(semver:major|minor|patch)` to bump [`VERSION`](VERSION).

## Optional LLM assistance (OpenAI, BYOK)

The wizard can call an **LLM** for optional text suggestions. **Today** the API integrates only with **OpenAI** (Chat Completions) using a **BYOK** (bring your own) API key: users save their key encrypted in the app database; the **hosting operator does not supply** a platform key or pay OpenAI. See [`docs/ai-assist.md`](docs/ai-assist.md) for routes, env, and policy.

- **Extensible to more providers (future):** the roadmap is to keep the same **v1 context JSON** contract and add other backends; until then, `GET /api/v1/ai/prompt-disclosure` returns `provider: "openai"` and an empty `future_providers` list. Prompt strings live in [`src/api/internal/aiassist/prompts.go`](src/api/internal/aiassist/prompts.go) so you can audit them without the UI.
- **Self-serve review:** the **Inspect prompting (read-only)** area in the AI assist panel, or a direct `GET /api/v1/ai/prompt-disclosure` call, returns the system prompt and parameters the server uses (no secrets).

## Operator security guardrails (optional)

For shared or production-like self-hosts, the API can block unsafe wizard choices before code preview, for example `IAC_BLOCK_SSH_OPEN_WORLD=1` to reject `ssh_cidr` of `0.0.0.0/0` or `::/0` on `POST /api/v1/preview`. See [`docs/security.md`](docs/security.md#operator-guardrails-self-hosted).

## Documentation

- [`docs/local-dev.md`](docs/local-dev.md)
- [`docs/security.md`](docs/security.md)
- [`docs/future-ideas.md`](docs/future-ideas.md)
- [`docs/ai-assist.md`](docs/ai-assist.md) — optional AI / OpenAI BYOK
- [`docs/aws-deploy.md`](docs/aws-deploy.md) — S3 + CloudFront + ALB + Lambda in **us-east-1**, GitHub Actions deploy/destroy

## AWS serverless hosting

Manual **Deploy AWS** and **Destroy AWS** workflows build the Lambda zip, run Terraform (`deploy/terraform/aws`), sync the Vite build to S3, and invalidate CloudFront. See [`docs/aws-deploy.md`](docs/aws-deploy.md) for OIDC setup and multi-region notes.
