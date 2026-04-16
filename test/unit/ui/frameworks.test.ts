import { describe, it, expect } from "vitest";
import { FRAMEWORK_IDS } from "@ui/api";

describe("framework catalog", () => {
  it("exports five frameworks", () => {
    expect(FRAMEWORK_IDS).toHaveLength(5);
    expect(new Set(FRAMEWORK_IDS).size).toBe(5);
  });
});
