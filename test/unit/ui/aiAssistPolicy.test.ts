import { describe, it, expect } from "vitest";
import { emptyWizardState, type WizardState } from "@ui/api";
import { AI_ASSIST_CONTEXT_VERSION, buildAiContextForAiAssist } from "@ui/aiAssistPolicy";

describe("buildAiContextForAiAssist", () => {
  it("returns v1 app shape and field mapping", () => {
    const s: WizardState = {
      ...emptyWizardState(),
      framework: "terraform",
      region: "us-west-2",
      vpc_id: "vpc-a",
      subnet_id: "subnet-b",
      instance_type: "t3.small",
      ami: "ami-xyz",
      key_name: "my-key",
      security_group_ids: ["sg-1", "sg-2"],
      associate_public_ip: false,
      imdsv2_required: true,
      enable_ebs_encryption: true,
      ssh_cidr: "10.0.0.0/8",
    };
    const c = buildAiContextForAiAssist(s);
    expect(c.v).toBe(AI_ASSIST_CONTEXT_VERSION);
    expect(c.app).toBe("iac-builder");
    expect(c.wizard.subnet_id).toBe("subnet-b");
    expect(c.wizard.security_group_count).toBe(2);
    expect(c.wizard.ssh_cidr_configured).toBe(true);
    expect(c.stateSummaryLabel).toMatch(/^wizard:[0-9a-f]{8}$/);
  });

  it("is stable for identical input", () => {
    const a = { ...emptyWizardState(), region: "eu-central-1" };
    const b = { ...emptyWizardState(), region: "eu-central-1" };
    const ca = buildAiContextForAiAssist(a);
    const cb = buildAiContextForAiAssist(b);
    expect(ca.stateSummaryLabel).toBe(cb.stateSummaryLabel);
  });

  it("sets ssh_cidr_configured to false when empty", () => {
    const s = { ...emptyWizardState(), ssh_cidr: "  " };
    expect(buildAiContextForAiAssist(s).wizard.ssh_cidr_configured).toBe(false);
  });

  it("sets app_runtime_secret_ref_configured when secret names are set", () => {
    const s = {
      ...emptyWizardState(),
      app_secretsmanager_secret_name: "my/secret",
      app_ssm_parameter_name: "",
    };
    expect(buildAiContextForAiAssist(s).wizard.app_runtime_secret_ref_configured).toBe(true);
  });
});
