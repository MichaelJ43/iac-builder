import { vi } from "vitest";

export function urlString(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
}

/**
 * Default fetch behavior for App tests: auth off, empty presets, empty preview.
 */
export function createAppFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const u = urlString(input);
    if (u.includes("/auth/status")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ auth: "disabled" as const }),
        text: async () => "",
      };
    }
    if (/\/api\/v1\/presets\/?(\?.*)?$/.test(u)) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ presets: [] }),
        text: async () => "",
      };
    }
    if (u.includes("/api/v1/presets/")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "",
      };
    }
    if (u.includes("/preview") || u.includes("/security/recommendations")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: {}, recommendations: [] }),
        text: async () => "",
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    };
  });
}
