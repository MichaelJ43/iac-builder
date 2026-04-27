/**
 * Fails fast if the UI (Vite) app has not been installed, since Playwright
 * starts the dev server from src/ui. Run from repo root: `cd src/ui && npm ci`.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// This file is test/ui/scripts/ — repo root is three levels up.
const repoRoot = join(__dirname, "..", "..", "..");
const marker = join(repoRoot, "src", "ui", "node_modules", "vite", "package.json");
if (!existsSync(marker)) {
  console.error(
    "E2E requires src/ui dependencies. From the repo root run:\n  cd src/ui && npm ci"
  );
  process.exit(1);
}
