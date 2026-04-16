import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "cd ../../src/ui && npm run dev -- --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173",
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
