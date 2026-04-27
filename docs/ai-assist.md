# Optional AI assist — policy and engineering notes

This document describes optional **AI assist** in the iac-builder web UI. The **hosting operator does not supply** OpenAI (or other) API keys; users who want suggestions use **BYOK** (bring your own key), stored **encrypted** in the app database with the same `IAC_MASTER_KEY` as other secrets. Aligns with [`docs/future-ideas.md`](future-ideas.md).

## When the UI shows the “AI assist” area

- The Vite app reads **`VITE_IAC_AI_ASSIST`**. It must be the string `true` at **build** time. See [`.env.example`](../.env.example).

## BYOK (bring your own OpenAI key)

- **`PUT /api/v1/ai/openai-key`** — body `{ "openai_api_key": "sk-…" }`. The key is encrypted at rest; the API never returns the full key again. **`GET /api/v1/ai/openai-key`** returns `{ "configured": bool, "key_last4"?: "…" }` for display. **`DELETE /api/v1/ai/openai-key`** removes it.
- When **platform auth** is enabled, these routes and **`POST /api/v1/ai/assist`** require a **signed-in** user; keys are **per user**. When auth is **disabled** (typical local dev), a **single** key is stored for the anonymous tenant (`user_id` empty).
- **Billing:** the user’s key is used to call the OpenAI **Chat Completions** API; **usage is billed by OpenAI to that key**, not by the iac-builder operator.

## `POST /api/v1/ai/assist`

- **Body:** `{ "context": <v1 object> }` from `buildAiContextForAiAssist` (`v: 1`, `app: "iac-builder"`, `wizard` object, etc.).
- **Rate limit:** per client IP, per minute — `IAC_AI_ASSIST_RPM` (default **20**). **429** + `Retry-After: 60` when exceeded.
- **With a saved key:** the server calls OpenAI with your key; response includes `mode: "openai"` and `suggestions` (string). **Env:** `IAC_OPENAI_MODEL` (default `gpt-4o-mini`), `IAC_OPENAI_BASE_URL` (default `https://api.openai.com`, override for tests or proxies).
- **Without a key:** `mode: "stub"`, with a message explaining BYOK; no call to OpenAI.

## Data sent to the model (contract)

- **In scope:** the same **v1 JSON context** as in the panel (IaC parameters only). It does **not** include the app’s `IAC_MASTER_KEY`, your encrypted AWS profiles, or generated file bodies.
- **User responsibility:** treat model output as **untrusted**; use preview and security recommendations before any real deployment.

## Controls in the panel

- **Checkbox** before “Get AI suggestions.”
- **Context preview** (read-only JSON) before any request.
- **Requests are user-triggered** only; no background calls to the model.

## Product / legal (operator)

Before **production** use of BYOK, the operator should complete **subprocessor** / **terms** / **privacy** review for OpenAI (or your chosen endpoint), regional rules, and support posture. The codebase does not provide legal sign-off; **P1 is closed from an implementation standpoint** once this doc and routes ship.

## References

- UI: [`src/ui/src/AiAssistPanel.tsx`](../src/ui/src/AiAssistPanel.tsx), [`aiAssistPolicy.ts`](../src/ui/src/aiAssistPolicy.ts)  
- Roadmap: [`docs/future-ideas.md`](future-ideas.md), [`AGENTS.md`](../AGENTS.md)
