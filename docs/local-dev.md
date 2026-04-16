# Local development

## API

Working directory: `src/api`.

| Variable | Purpose |
|----------|---------|
| `IAC_MASTER_KEY` | 64 hex chars; AES-256 key for profile encryption |
| `SQLITE_DSN` | SQLite DSN (default `file:./data/app.sqlite?...`) |
| `LISTEN_ADDR` | Listen address (default `:8080`) |
| `APP_VERSION` | Reported by `GET /api/v1/version` |
| `CORS_ORIGIN` | CORS allow origin (default `*`) |

## UI

Working directory: `src/ui`. Vite dev server proxies `/api` and `/healthz` to `http://127.0.0.1:8080`.

## Tests

See root [`Makefile`](../Makefile) and [`AGENTS.md`](../AGENTS.md).
