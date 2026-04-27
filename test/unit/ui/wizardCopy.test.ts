import { describe, expect, it } from "vitest";
import { subnetFieldHelp, vpcFieldHelp } from "@ui/wizardCopy";

describe("wizardCopy", () => {
  it("vpcFieldHelp describes AWS with profile", () => {
    expect(vpcFieldHelp(true, true, "us-east-1")).toMatch(/us-east-1/);
  });
  it("vpcFieldHelp is short for non-AWS", () => {
    expect(vpcFieldHelp(false, false, "")).toMatch(/Paste/);
  });
  it("subnetFieldHelp differs for AWS vs non-AWS", () => {
    expect(subnetFieldHelp(true)).toMatch(/profile/);
    expect(subnetFieldHelp(false)).toMatch(/Required/);
  });
});
