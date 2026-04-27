import type { WizardState } from "./api";

const ORDER: (keyof WizardState)[] = [
  "framework",
  "cloud",
  "region",
  "vpc_id",
  "subnet_id",
  "instance_type",
  "ami",
  "key_name",
  "security_group_ids",
  "associate_public_ip",
  "imdsv2_required",
  "ssh_cidr",
  "enable_ebs_encryption",
  "app_secretsmanager_secret_name",
  "app_ssm_parameter_name",
];

export const WIZARD_FIELD_LABELS: Record<keyof WizardState, string> = {
  framework: "IaC framework",
  cloud: "Cloud",
  region: "Region",
  vpc_id: "VPC ID",
  subnet_id: "Subnet ID",
  instance_type: "Instance type",
  ami: "AMI ID",
  key_name: "Key name",
  security_group_ids: "Security groups",
  associate_public_ip: "Associate public IP",
  imdsv2_required: "Require IMDSv2",
  ssh_cidr: "SSH CIDR",
  enable_ebs_encryption: "Encrypt root EBS",
  app_secretsmanager_secret_name: "App Secrets Manager name",
  app_ssm_parameter_name: "App SSM parameter",
};

function sortedJoin(ids: string[]): string {
  return [...ids].sort().join(", ");
}

function fieldEqual(key: keyof WizardState, a: WizardState, b: WizardState): boolean {
  if (key === "security_group_ids") {
    const xa = sortedJoin(a.security_group_ids);
    const xb = sortedJoin(b.security_group_ids);
    return xa === xb;
  }
  return a[key] === b[key];
}

function formatField(key: keyof WizardState, value: WizardState[keyof WizardState]): string {
  if (key === "security_group_ids") {
    const ids = value as string[];
    return ids.length ? ids.join(", ") : "(none)";
  }
  if (
    key === "associate_public_ip" ||
    key === "imdsv2_required" ||
    key === "enable_ebs_encryption"
  ) {
    return (value as boolean) ? "Yes" : "No";
  }
  const s = String(value ?? "");
  return s === "" ? "(empty)" : s;
}

export type WizardFieldDiff = {
  key: keyof WizardState;
  label: string;
  baseline: string;
  current: string;
};

/** Rows for fields that differ between baseline (e.g. saved preset) and the live wizard. */
export function diffWizardStates(baseline: WizardState, current: WizardState): WizardFieldDiff[] {
  const out: WizardFieldDiff[] = [];
  for (const key of ORDER) {
    if (fieldEqual(key, baseline, current)) {
      continue;
    }
    out.push({
      key,
      label: WIZARD_FIELD_LABELS[key],
      baseline: formatField(key, baseline[key]),
      current: formatField(key, current[key]),
    });
  }
  return out;
}
