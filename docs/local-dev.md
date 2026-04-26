# Local development

## API

Working directory: `src/api`.

| Variable | Purpose |
|----------|---------|
| `IAC_MASTER_KEY` | 64 hex chars; AES-256 key for profile encryption |
| `SQLITE_DSN` | SQLite DSN (default `file:./data/app.sqlite?...`) |
| `LISTEN_ADDR` | Listen address (default `:8080`) |
| `APP_VERSION` | Reported by `GET /api/v1/version` |
| `CORS_ORIGIN` | Single allowed origin; legacy, see `CORS_ALLOWED_ORIGINS` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of `Origin` values for browsers (required when using cookies; use with `http://localhost:5173` for Vite) |
| `AUTH_API_BASE` | If set (e.g. `https://api.michaelj43.dev`), profile routes require a valid **shared-api-platform** session; forwards `Cookie` to `GET {base}/v1/auth/me` |
| `AUTH_ME_PATH` | Override path for auth me (default `/v1/auth/me`) |
| `AUTH_USER_ID_JSON_KEYS` | Comma-separated JSON keys to read user id, e.g. `sub` or `user.id` (default `sub`) |

## UI

Working directory: `src/ui`. Vite dev server proxies `/api` and `/healthz` to `http://127.0.0.1:8080`.

## Tests

See root [`Makefile`](../Makefile) and [`AGENTS.md`](../AGENTS.md).
