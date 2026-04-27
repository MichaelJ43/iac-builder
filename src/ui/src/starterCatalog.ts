import type { Framework, WizardState } from "./api";
import { emptyWizardState } from "./api";

export const STARTER_CATALOG_TAG_ALL = "__all__" as const;

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  /** Short tags for filtering the quick-builder list (e.g. public, private, cost). */
  tags: string[];
  state: WizardState;
};

function withDefaults(
  base: Pick<WizardState, "framework" | "region" | "subnet_id" | "instance_type" | "ami"> &
    Partial<WizardState>
): WizardState {
  return { ...emptyWizardState(), ...base, cloud: "aws" };
}

/**
 * Curated quick-start wizards (quick-builder stack catalog). Placeholder AWS IDs are obvious fakes;
 * users must replace with account-specific values before any apply.
 */
export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    id: "terraform-us-east-1-skeleton",
    name: "Terraform · us-east-1 (skeleton)",
    description:
      "Filled-out shape with example subnet, security group, and AMI—swap every replace_/example/placeholder ID for your account.",
    tags: ["public", "terraform"],
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
    tags: ["private", "ssm", "terraform"],
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
  {
    id: "cloudformation-us-east-1-skeleton",
    name: "CloudFormation · us-east-1 (skeleton)",
    description:
      "Same network/compute story as the Terraform starter, with CloudFormation as the target framework. Replace placeholder IDs and validate the template in your account.",
    tags: ["public", "cloudformation"],
    state: withDefaults({
      framework: "cloudformation" satisfies Framework,
      region: "us-east-1",
      vpc_id: "vpc-0replace0000000",
      subnet_id: "subnet-0replace00000000",
      instance_type: "t3.micro",
      ami: "ami-0example0000000",
      security_group_ids: ["sg-0replace00000000"],
      associate_public_ip: true,
      imdsv2_required: true,
      enable_ebs_encryption: true,
      ssh_cidr: "198.18.0.0/32",
    }),
  },
  {
    id: "graviton-t4g-private",
    name: "Graviton (t4g) · private, encrypted",
    description:
      "t4g.small in a private-subnet style layout (no public IP) with IMDSv2 and encryption—good pattern for cost-sensitive Linux workloads. Pick a Graviton-compatible AMI in your region.",
    tags: ["private", "cost", "graviton", "terraform"],
    state: withDefaults({
      framework: "terraform" satisfies Framework,
      region: "us-east-1",
      subnet_id: "subnet-0replace00000000",
      instance_type: "t4g.small",
      ami: "ami-0gravitonreplace00",
      key_name: "",
      security_group_ids: ["sg-0replace00000000"],
      associate_public_ip: false,
      imdsv2_required: true,
      enable_ebs_encryption: true,
      ssh_cidr: "",
    }),
  },
  {
    id: "dev-minimal-t3",
    name: "Dev / lab · t3 minimal",
    description:
      "Smallest t3, single security group, public IP (typical for throwaway dev instances). Tighten ssh_cidr and turn off public IP for anything beyond lab use.",
    tags: ["public", "cost", "dev", "terraform"],
    state: withDefaults({
      framework: "terraform" satisfies Framework,
      region: "us-west-2",
      vpc_id: "vpc-0devreplace00000",
      subnet_id: "subnet-0devreplace0000",
      instance_type: "t3.micro",
      ami: "ami-0devreplace000000",
      security_group_ids: ["sg-0devreplace0000"],
      associate_public_ip: true,
      imdsv2_required: false,
      enable_ebs_encryption: false,
      ssh_cidr: "",
    }),
  },
];

/** Distinct tag values from all templates, sorted, excluding broad categories that would duplicate. */
export function distinctStarterTags(templates: readonly StarterTemplate[]): string[] {
  const s = new Set<string>();
  for (const t of templates) {
    for (const x of t.tags) {
      s.add(x);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export function getStarterTemplate(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}

export function filterStartersByTag(
  templates: readonly StarterTemplate[],
  tag: string
): readonly StarterTemplate[] {
  if (tag === "" || tag === STARTER_CATALOG_TAG_ALL) {
    return templates;
  }
  return templates.filter((t) => t.tags.includes(tag));
}
