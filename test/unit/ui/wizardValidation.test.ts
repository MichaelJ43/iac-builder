import { describe, expect, it } from "vitest";
import { emptyWizardState } from "@ui/api";
import { validateWizardForPreview } from "@ui/wizardValidation";

function validAwsBase() {
  const s = emptyWizardState();
  s.framework = "terraform";
  s.cloud = "aws";
  s.region = "us-east-1";
  s.subnet_id = "subnet-0123456789abcdef0";
  s.instance_type = "t3.micro";
  s.ami = "ami-0123456789abcdef0";
  return s;
}

describe("validateWizardForPreview", () => {
  it("passes when state matches server Validate() requirements", () => {
    const { ok, fields } = validateWizardForPreview(validAwsBase());
    expect(ok).toBe(true);
    expect(Object.keys(fields).length).toBe(0);
  });

  it("fails when framework is missing", () => {
    const s = validAwsBase();
    s.framework = "";
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(false);
    expect(fields.framework).toBeTruthy();
  });

  it("fails when region is blank", () => {
    const s = validAwsBase();
    s.region = "  ";
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(false);
    expect(fields.region).toMatch(/required/i);
  });

  it("fails when subnet_id is blank", () => {
    const s = validAwsBase();
    s.subnet_id = "";
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(false);
    expect(fields.subnet_id).toMatch(/required/i);
  });

  it("warns on likely-wrong subnet prefix when long enough", () => {
    const s = validAwsBase();
    s.subnet_id = "sub-0123456789abcdef0";
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(false);
    expect(fields.subnet_id).toMatch(/subnet-/i);
  });

  it("fails when ami is missing or wrong prefix when typed", () => {
    const s = validAwsBase();
    s.ami = "";
    expect(validateWizardForPreview(s).fields.ami).toMatch(/required/i);
    s.ami = "image-0123";
    expect(validateWizardForPreview(s).fields.ami).toMatch(/ami-/i);
  });

  it("rejects invalid security group token", () => {
    const s = validAwsBase();
    s.security_group_ids = ["sg-0abc", "bad"];
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(false);
    expect(fields.security_group_ids).toMatch(/bad/i);
  });

  it("rejects invalid ssh CIDR when set", () => {
    const s = validAwsBase();
    s.ssh_cidr = "not-a-cidr";
    expect(validateWizardForPreview(s).fields.ssh_cidr).toBeTruthy();
    s.ssh_cidr = "10.0.0.0/8";
    expect(validateWizardForPreview(s).ok).toBe(true);
  });

  it("accepts a minimal valid GCP state (no AWS subnet/ami shape)", () => {
    const s = validAwsBase();
    s.cloud = "gcp";
    s.subnet_id = "projects/p/regions/us-central1/subnetworks/default";
    s.ami = "debian-12";
    s.security_group_ids = [];
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(true);
    expect(Object.keys(fields).length).toBe(0);
  });

  it("accepts a minimal valid Kubernetes state", () => {
    const s = validAwsBase();
    s.cloud = "k8s";
    s.subnet_id = "services";
    s.ami = "nginx:1.25";
    s.security_group_ids = [];
    const { ok, fields } = validateWizardForPreview(s);
    expect(ok).toBe(true);
    expect(Object.keys(fields).length).toBe(0);
  });
});
