import { describe, it, expect } from "vitest";
import { errorMessageFromUnknown, normalizeFetchError } from "@ui/fetchUtils";

describe("normalizeFetchError", () => {
  it("extracts title from HTML 502 pages", async () => {
    const html = `<html><head><title>502 Bad Gateway</title></head><body></body></html>`;
    const res = new Response(html, { status: 502, statusText: "Bad Gateway" });
    const msg = await normalizeFetchError(res);
    expect(msg).toContain("502");
    expect(msg).toContain("Bad Gateway");
    expect(msg).not.toContain("<html>");
  });

  it("detects HTML via DOCTYPE prefix", async () => {
    const html = `<!DOCTYPE html><html><head><title>503 Service Temporarily Unavailable</title></head></html>`;
    const res = new Response(html, { status: 503 });
    const msg = await normalizeFetchError(res);
    expect(msg).toContain("503");
    expect(msg).toContain("Service Temporarily Unavailable");
  });

  it("falls back when response.text() throws", async () => {
    const res = {
      status: 502,
      statusText: "",
      text: () => Promise.reject(new Error("boom")),
    } as unknown as Response;
    expect(await normalizeFetchError(res)).toBe("HTTP 502");
  });

  it("handles HTML without title", async () => {
    const res = new Response("<html><body>oops</body></html>", { status: 502 });
    const msg = await normalizeFetchError(res);
    expect(msg).toContain("502");
    expect(msg).toContain("HTML");
    expect(msg).not.toContain("<body>");
  });

  it("passes through short JSON/text errors", async () => {
    const res = new Response(`{"error":"nope"}`, { status: 400 });
    expect(await normalizeFetchError(res)).toBe(`{"error":"nope"}`);
  });

  it("truncates very long non-HTML bodies", async () => {
    const body = "x".repeat(900);
    const res = new Response(body, { status: 500 });
    const msg = await normalizeFetchError(res);
    expect(msg.length).toBeLessThanOrEqual(801);
    expect(msg.endsWith("…")).toBe(true);
  });
});

describe("errorMessageFromUnknown", () => {
  it("uses Error.message", () => {
    expect(errorMessageFromUnknown(new Error("hello"))).toBe("hello");
  });

  it("stringifies non-errors", () => {
    expect(errorMessageFromUnknown(42)).toBe("42");
  });
});

describe("normalizeFetchError edge cases", () => {
  it("uses status when body is empty", async () => {
    const res = new Response("", { status: 503, statusText: "Service Unavailable" });
    const msg = await normalizeFetchError(res);
    expect(msg).toMatch(/503/);
  });
});
