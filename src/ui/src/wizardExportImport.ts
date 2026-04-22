import type { WizardState } from "./api";
import { coerceWizardState } from "./presetApi";

export const WIZARD_EXPORT_VERSION = 1 as const;

export type WizardExportV1 = {
  version: typeof WIZARD_EXPORT_VERSION;
  app: "iac-builder";
  exportedAt: string;
  state: WizardState;
};

export function buildWizardExport(state: WizardState): WizardExportV1 {
  return {
    version: WIZARD_EXPORT_VERSION,
    app: "iac-builder",
    exportedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
}

export function stringifyExport(exp: WizardExportV1): string {
  return JSON.stringify(exp, null, 2);
}

/** Read `File` as UTF-8 text (FileReader fallback for test environments without `file.text()`). */
export async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsText(file);
  });
}

/**
 * Parse a JSON file from disk (or clipboard) into a `WizardState`.
 * Accepts our v1 export wrapper, API-style `{ state: {...} }`, or a flat object.
 */
export function parseWizardImport(jsonText: string): WizardState {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("That file is not a valid wizard export.");
  }
  const o = raw as Record<string, unknown>;
  if (o.version != null && typeof o.version === "number" && o.version !== WIZARD_EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${o.version}. Update iac-builder and try again.`);
  }
  return coerceWizardState(raw);
}
