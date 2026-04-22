import { describe, it, expect } from "vitest";
import { emptyWizardState, type WizardState } from "@ui/api";
import {
  buildWizardExport,
  parseWizardImport,
  stringifyExport,
  WIZARD_EXPORT_VERSION,
} from "@ui/wizardExportImport";

const sample: WizardState = {
  ...emptyWizardState(),
  framework: "terraform",
  region: "us-east-1",
  subnet_id: "subnet-abc",
  instance_type: "t3.micro",
  ami: "ami-123",
};

describe("wizardExportImport", () => {
  it("builds a v1 export and round-trips", () => {
    const exp = buildWizardExport(sample);
    expect(exp.version).toBe(WIZARD_EXPORT_VERSION);
    expect(exp.app).toBe("iac-builder");
    expect(exp.state).toEqual(sample);
    const text = stringifyExport(exp);
    const back = parseWizardImport(text);
    expect(back).toEqual(sample);
  });

  it("parses API-style { state: ... }", () => {
    const s = { state: { ...sample, region: "eu-west-1" } };
    const back = parseWizardImport(JSON.stringify(s));
    expect(back.region).toBe("eu-west-1");
  });

  it("rejects bad JSON and unsupported versions", () => {
    expect(() => parseWizardImport("not json")).toThrow(/valid JSON/);
    expect(() => parseWizardImport("null")).toThrow(/valid wizard export/);
    expect(() => parseWizardImport(JSON.stringify({ version: 99, state: sample }))).toThrow(
      /Unsupported export version/
    );
  });

});
