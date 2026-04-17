/**
 * Turn failed fetch bodies into short messages. ALB/nginx often return HTML
 * (e.g. 502 pages); showing that raw string in the UI is confusing.
 */
export async function normalizeFetchError(res: Response): Promise<string> {
  let raw: string;
  try {
    raw = (await res.text()).trim();
  } catch {
    return `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
  }

  const looksLikeHtml =
    raw.startsWith("<!DOCTYPE") ||
    raw.startsWith("<!doctype") ||
    (raw.startsWith("<html") && raw.includes("</html>")) ||
    (raw.startsWith("<") && /<\/\s*body\s*>/i.test(raw));

  if (looksLikeHtml) {
    const title = raw.match(/<title>\s*([^<]*?)\s*<\/title>/i)?.[1]?.trim();
    const statusPart = [res.status, res.statusText].filter(Boolean).join(" ");
    if (title) {
      return `HTTP ${statusPart}: ${title}`;
    }
    return `HTTP ${statusPart} (server returned HTML instead of JSON)`;
  }

  if (raw.length > 800) {
    return `${raw.slice(0, 800)}…`;
  }
  return raw || `HTTP ${[res.status, res.statusText].filter(Boolean).join(" ")}`;
}

/** Prefer `Error.message` so UI does not prefix `Error: ` from `String(e)`. */
export function errorMessageFromUnknown(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}
