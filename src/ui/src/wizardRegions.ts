import type { WizardState } from "./api";

/** Maximum target regions for one preview (matches server gen.MaxTargetRegions). */
export const MAX_TARGET_REGIONS = 8;

/**
 * Deduplicated target regions: prefers `regions[]`, else legacy `region` string.
 * Lowercases AWS region ids; preserves first-occurrence order.
 */
export function targetRegionsFromState(s: WizardState): string[] {
  const fromArr = (s.regions ?? []).map((r) => r.trim().toLowerCase()).filter((x) => x.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of fromArr) {
    if (seen.has(r)) {
      continue;
    }
    seen.add(r);
    out.push(r);
  }
  if (out.length === 0) {
    const one = s.region.trim().toLowerCase();
    if (one) {
      out.push(one);
    }
  }
  return out;
}

/**
 * Parses comma/whitespace-separated region list (for “additional regions” only).
 * Does not include the primary region; callers merge with it.
 */
export function parseAdditionalRegionsList(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of raw.split(/[,;]+/)) {
    const r = p.trim().toLowerCase();
    if (!r || seen.has(r)) {
      continue;
    }
    seen.add(r);
    out.push(r);
    if (out.length >= MAX_TARGET_REGIONS) {
      break;
    }
  }
  return out;
}

/**
 * Merges primary + additional into a list capped at MAX_TARGET_REGIONS.
 */
export function mergeAwsRegions(primary: string, additionalRaw: string): string[] {
  const a = primary.trim().toLowerCase();
  const rest = parseAdditionalRegionsList(additionalRaw);
  const seen = new Set<string>();
  const out: string[] = [];
  if (a) {
    seen.add(a);
    out.push(a);
  }
  for (const r of rest) {
    if (seen.has(r)) {
      continue;
    }
    seen.add(r);
    out.push(r);
    if (out.length >= MAX_TARGET_REGIONS) {
      break;
    }
  }
  return out;
}

/**
 * For API calls: keep `region` in sync with `regions[0]` (legacy single-field and hashes).
 */
export function normalizeWizardStateForAPI(s: WizardState): WizardState {
  const t = targetRegionsFromState(s);
  return { ...s, regions: t, region: t[0] ?? "" };
}
