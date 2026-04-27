import { describe, it, expect } from "vitest";
import { FRAMEWORK_IDS } from "@ui/api";

describe("framework catalog", () => {
  it("exports unique frameworks in UI order", () => {
    expect(FRAMEWORK_IDS).toHaveLength(7);
    expect(new Set(FRAMEWORK_IDS).size).toBe(7);
  });
});
