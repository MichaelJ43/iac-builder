import type { AiAssistContextV1 } from "./aiAssistPolicy";
import { withCredentials } from "./fetchWithCredentials";
import { normalizeFetchError } from "./fetchUtils";

const base = "";

export type AiAssistResponse = {
  ok: boolean;
  mode: string;
  message: string;
  suggestions: string;
};

/** POST /api/v1/ai/assist — server validates context, rate-limits, returns stub until a model is wired. */
export async function postAiAssist(context: AiAssistContextV1): Promise<AiAssistResponse> {
  const res = await fetch(`${base}/api/v1/ai/assist`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  if (res.status === 429) {
    throw new Error("Too many AI assist requests. Try again in about a minute.");
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  return (await res.json()) as AiAssistResponse;
}

export type OpenAIKeyStatus = { configured: false } | { configured: true; key_last4: string };

export async function getOpenAIKeyStatus(): Promise<OpenAIKeyStatus> {
  const res = await fetch(`${base}/api/v1/ai/openai-key`, { ...withCredentials });
  if (res.status === 401) {
    throw new Error("You must be signed in to manage your API key on this host.");
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  return (await res.json()) as OpenAIKeyStatus;
}

export async function putOpenAIKey(openai_api_key: string): Promise<void> {
  const res = await fetch(`${base}/api/v1/ai/openai-key`, {
    ...withCredentials,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openai_api_key }),
  });
  if (res.status === 401) {
    throw new Error("You must be signed in to save your API key on this host.");
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
}

export async function deleteOpenAIKey(): Promise<void> {
  const res = await fetch(`${base}/api/v1/ai/openai-key`, {
    ...withCredentials,
    method: "DELETE",
  });
  if (res.status === 401) {
    throw new Error("You must be signed in to remove your API key on this host.");
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
}
