# Server presets and quick-builder catalog (P3)

## Quick-builder stack catalog (bundled)

Starter templates are defined in [`src/ui/src/starterCatalog.ts`](../src/ui/src/starterCatalog.ts). Each entry has a unique `id`, `name`, `description`, `tags` (for filtering in the UI), and a `state` (wizard). Tags are free-form strings (e.g. `public`, `private`, `terraform`, `ssm`).

The UI lets you **filter the starter dropdown** by tag; “All tags” shows every entry.

## Server presets (API)

Presets are stored in SQLite with the wizard state wrapped in a **v1 envelope**:

```json
{
  "format_version": 1,
  "labels": ["team-core", "prod"],
  "state": { /* WizardState */ }
}
```

- **`format_version`:** currently `1`. Future versions may extend the shape.
- **`labels`:** optional lowercase tag strings (comma-separated in the “Save to API as preset” form). They power **in-memory filtering** in the UI (all presets are listed from `GET /api/v1/presets`; the UI can narrow by label without a second request).
- **`IAC_DEFAULT_PRESET_LABELS`:** on the **API** process, a comma-separated list of label strings merged with user-provided labels on **create** (deduplicated). Use this to tag every new preset in a self-hosted deployment (e.g. a team or org “library”).

### API

- **`POST /api/v1/presets`** — body `name`, `data` with `state` and optional `labels` / `format_version`. The server normalizes and may merge `IAC_DEFAULT_PRESET_LABELS`.
- **`GET /api/v1/presets`** — each row includes `format_version` and `labels` parsed from the stored JSON.
- **`GET /api/v1/presets?label=foo`** — same list filtered server-side to presets that include the label (for scripts or a thin client). The web UI currently filters in the client after a full list.

### Import / export

- **Export configuration** (toolbar) and **Download as JSON** (preset) use the v1 **wizard** export file shape, not the raw server envelope, so files stay portable.
- **Create from JSON file** still accepts a v1 export and saves it through the v1 envelope on the server.

See also the root [`README.md`](../README.md) and [`future-ideas.md`](future-ideas.md) (Completed P3).
