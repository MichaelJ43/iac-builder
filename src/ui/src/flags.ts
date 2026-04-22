/**
 * Build-time and runtime feature flags (Vite `import.meta.env` — see VITE_* in .env.example).
 */
export function isAiAssistUIEnabled(): boolean {
  return import.meta.env.VITE_IAC_AI_ASSIST === "true";
}
