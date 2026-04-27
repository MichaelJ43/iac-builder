import { defineConfig, devices } from "@playwright/test";

/** Vite port for e2e only — avoids clashing with a dev server on 5173 (or anything on 5174). Override with PLAYWRIGHT_VITE_PORT. */
const vitePort = process.env.PLAYWRIGHT_VITE_PORT ?? "33331";
const viteURL = `http://127.0.0.1:${vitePort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: viteURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // With CI=true, `make test` runs Playwright and must always spawn servers (reuseExistingServer: false).
  // On a developer machine, allow reusing *this* e2e server (viteURL) if already up — still distinct from 5173.
  webServer: [
    {
      command: `cd ../../src/ui && VITE_IAC_AI_ASSIST=true npm run dev -- --host 127.0.0.1 --port ${vitePort}`,
      url: viteURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        "cd ../../src/api && IAC_MASTER_KEY=0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 LISTEN_ADDR=127.0.0.1:8080 SQLITE_DSN=file::memory:?cache=shared APP_VERSION=0.1.0 go run ./cmd/iac-builder-api",
      url: "http://127.0.0.1:8080/healthz",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
