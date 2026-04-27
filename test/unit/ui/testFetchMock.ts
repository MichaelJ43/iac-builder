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
    if (u.includes("/api/v1/operations")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          app_version: "test",
          region: {
            current: "us-east-1",
            enabled: ["us-east-1"],
            catalog: ["us-east-1", "us-west-2"],
            current_in_enabled: true,
          },
          telemetry: { server_opt_in: false, instructions: "" },
          posture: {
            data_residency: "us-east-1",
            tls_terminated: false,
            hosted_readiness: "ok",
          },
        }),
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
