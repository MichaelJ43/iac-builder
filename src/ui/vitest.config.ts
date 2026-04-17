import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    include: ["../../test/unit/ui/**/*.test.ts", "../../test/unit/ui/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        "src/wizardHistory.ts",
        "src/useWizardUndoState.ts",
        "src/wizardDiff.ts",
        "src/presetApi.ts",
        "src/PresetDiffTable.tsx",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@ui": path.resolve(root, "src"),
      "@testing-library/react": path.resolve(root, "node_modules/@testing-library/react"),
      "@testing-library/user-event": path.resolve(root, "node_modules/@testing-library/user-event"),
    },
  },
});
