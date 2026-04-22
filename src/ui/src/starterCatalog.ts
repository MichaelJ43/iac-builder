import type { Framework, WizardState } from "./api";
import { emptyWizardState } from "./api";

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  state: WizardState;
};

function withDefaults(
  base: Pick<WizardState, "framework" | "region" | "subnet_id" | "instance_type" | "ami"> &
    Partial<WizardState>
): WizardState {
  return { ...emptyWizardState(), ...base, cloud: "aws" };
}

/**
 * Curated quick-start wizards (P3 catalog). Placeholder AWS IDs are obvious fakes; users must
 * replace with account-specific values before any apply.
 */
export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    id: "terraform-us-east-1-skeleton",
    name: "Terraform · us-east-1 (skeleton)",
    description:
      "Filled-out shape with example subnet, security group, and AMI—swap every replace_/example/placeholder ID for your account.",
    state: withDefaults({
      framework: "terraform" satisfies Framework,
      region: "us-east-1",
      vpc_id: "vpc-0replace0000000",
      subnet_id: "subnet-0replace00000000",
      instance_type: "t3.micro",
      ami: "ami-0example0000000",
      security_group_ids: ["sg-0replace00000000"],
      associate_public_ip: true,
      imdsv2_required: true,
      enable_ebs_encryption: true,
      ssh_cidr: "203.0.113.10/32",
    }),
  },
  {
    id: "ssm-biased-no-ssh",
    name: "SSM-style (IMDSv2, encrypted volume, no key pair)",
    description:
      "Leans on Session Manager patterns: no EC2 key, private-friendly defaults, EBS encryption on; still set subnet, AMI, and security groups to match your design.",
    state: withDefaults({
      framework: "terraform" satisfies Framework,
      region: "us-east-1",
      subnet_id: "subnet-0replace00000000",
      instance_type: "t3.small",
      ami: "ami-0example0000000",
      key_name: "",
      security_group_ids: ["sg-0replace00000000"],
      associate_public_ip: false,
      imdsv2_required: true,
      enable_ebs_encryption: true,
      ssh_cidr: "",
    }),
  },
];

export function getStarterTemplate(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}
