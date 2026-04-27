import { describe, it, expect } from "vitest";
import {
  distinctStarterTags,
  getStarterTemplate,
  STARTER_CATALOG_TAG_ALL,
  STARTER_TEMPLATES,
} from "@ui/starterCatalog";

describe("starterCatalog", () => {
  it("lists unique non-empty templates with valid aws cloud", () => {
    const ids = new Set<string>();
    for (const t of STARTER_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.state.cloud).toBe("aws");
      expect(t.state.subnet_id.trim()).not.toBe("");
      expect(t.state.ami.trim()).not.toBe("");
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
    }
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("exposes all-tag sentinel and distinct tags", () => {
    expect(STARTER_CATALOG_TAG_ALL).toBeDefined();
    const tags = distinctStarterTags(STARTER_TEMPLATES);
    expect(tags).toContain("terraform");
  });

  it("getStarterTemplate returns undefined for unknown id", () => {
    expect(getStarterTemplate("no-such-id")).toBeUndefined();
  });

  it("getStarterTemplate returns the template for a known id", () => {
    const id = STARTER_TEMPLATES[0]!.id;
    expect(getStarterTemplate(id)?.id).toBe(id);
  });
});
