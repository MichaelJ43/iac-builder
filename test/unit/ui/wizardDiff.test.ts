import { describe, it, expect } from "vitest";
import type { WizardState } from "@ui/api";
import { diffWizardStates, WIZARD_FIELD_LABELS } from "@ui/wizardDiff";

const base = (): WizardState => ({
  framework: "terraform",
  cloud: "aws",
  region: "us-east-1",
  vpc_id: "",
  subnet_id: "subnet-a",
  instance_type: "t3.micro",
  ami: "ami-1",
  key_name: "",
  security_group_ids: ["sg-b", "sg-a"],
  associate_public_ip: false,
  imdsv2_required: false,
  ssh_cidr: "",
  enable_ebs_encryption: false,
});

describe("diffWizardStates", () => {
  it("returns no rows when states match", () => {
    const s = base();
    expect(diffWizardStates(s, { ...s })).toHaveLength(0);
  });

  it("treats security group order as equivalent", () => {
    const a = base();
    const b = { ...a, security_group_ids: ["sg-a", "sg-b"] };
    expect(diffWizardStates(a, b)).toHaveLength(0);
  });

  it("lists differing fields with labels", () => {
    const a = base();
    const b = { ...a, region: "eu-west-1", associate_public_ip: true };
    const d = diffWizardStates(a, b);
    expect(d.map((x) => x.key)).toEqual(["region", "associate_public_ip"]);
    expect(d[0]?.label).toBe(WIZARD_FIELD_LABELS.region);
    expect(d[0]?.baseline).toBe("us-east-1");
    expect(d[0]?.current).toBe("eu-west-1");
    expect(d[1]?.baseline).toBe("No");
    expect(d[1]?.current).toBe("Yes");
  });

  it("formats empty strings and missing security groups", () => {
    const a = base();
    const b = { ...a, ami: "", security_group_ids: [] };
    const d = diffWizardStates(a, b);
    const ami = d.find((x) => x.key === "ami");
    const sg = d.find((x) => x.key === "security_group_ids");
    expect(ami?.baseline).toBe("ami-1");
    expect(ami?.current).toBe("(empty)");
    expect(sg?.current).toBe("(none)");
  });
});
