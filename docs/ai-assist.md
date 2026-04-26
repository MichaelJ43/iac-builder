# Optional AI assist — policy and engineering notes

This document defines **P1 (UX)** for optional AI support in the iac-builder web UI, aligned with [`docs/future-ideas.md`](future-ideas.md). There is **no** automatic call to a language model in the default product build; a panel can be **opt-in at build time** via the environment variable described below.

## When the UI shows the “AI assist” area

- The Vite app reads **`VITE_IAC_AI_ASSIST`**. It must be the string `true` at **build** time to include the feature in the bundle. Set it in your shell or a `.env` file used for `npm run build` (see [`.env.example`](../.env.example)).

## Data we would ever send to a model (contract)

- **In scope (future):** only a **versioned, JSON “context” object** built from the current in-browser wizard state via [`aiAssistPolicy`](../src/ui/src/aiAssistPolicy.ts) (`buildAiContextForAiAssist`). The wizard is designed for **IaC parameters** (framework, region, resource IDs, flags). It does **not** contain AWS access keys or the app’s `IAC_MASTER_KEY`.
- **Out of scope:** anything from encrypted credential profiles, environment secrets, or the generated file contents unless a future, explicit, separate consent flow exists.
- **User responsibility:** treat model output as **untrusted**; always review and run through normal preview / security recommendations before any real deployment.

## Controls (shipped in the panel)

- **Consent:** a confirmation step (checkbox) is required before any future “request suggestions” action would be enabled.
- **Transparency:** a **read-only** preview of the same JSON context that a provider call would use (or a strict subset) is shown in the panel.
- **No silent network to LLMs** in the shipping configuration until an integration is added with explicit user action and (where applicable) server-side key handling.

## API: `POST /api/v1/ai/assist`

- **Body:** JSON `{ "context": <v1 object> }` where `context` is the same shape the UI builds with `buildAiContextForAiAssist` (must include `v: 1`, `app: "iac-builder"`, and a `wizard` object).
- **Rate limit:** per client IP, wall-clock minute window; cap set by `IAC_AI_ASSIST_RPM` (default **20**). On exceed: HTTP 429 and `Retry-After: 60`.
- **Default response:** JSON `{ "ok", "mode", "message", "suggestions" }` with `mode: "stub"` and no language model until a provider is configured server-side.

## Roadmap (not fully committed here)

- Wire an LLM provider with server-side keys, log redaction, and an abuse-oriented privacy / legal sign-off.

## References

- UI design: [`docs/design-language.md`](design-language.md)
- Roadmap: [`docs/future-ideas.md`](future-ideas.md), contributor testing rules: root [`AGENTS.md`](../AGENTS.md)
