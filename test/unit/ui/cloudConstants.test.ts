import { describe, expect, it } from "vitest";
import {
  imageFieldPlaceholder,
  instanceTypeFieldHelp,
  regionFieldHelp,
  regionPlaceholderForCloud,
  regionSuggestionsForCloud,
  vpcFieldPlaceholder,
} from "@ui/cloudConstants";

describe("cloudConstants", () => {
  it("suggests regions and placeholders for P8 targets", () => {
    expect(regionSuggestionsForCloud("k8s").length).toBeGreaterThan(0);
    expect(regionPlaceholderForCloud("vmware")).toBe("DC1");
    expect(regionFieldHelp("k8s")).toMatch(/namespace/i);
    expect(vpcFieldPlaceholder("ansible")).toMatch(/optional/i);
    expect(imageFieldPlaceholder("k8s")).toMatch(/nginx/);
    expect(instanceTypeFieldHelp("k8s")).toMatch(/hint/i);
  });
});
