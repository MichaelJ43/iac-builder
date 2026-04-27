import { FRAMEWORK_IDS, type CloudId, type Framework, type WizardState } from "./api";

export type WizardFieldErrorKey = keyof WizardState;

/**
 * Client-side checks before calling `/api/v1/preview` and `security/recommendations`.
 * Required-field rules match `github.com/MichaelJ43/iac-builder/api/internal/gen.WizardState.Validate`.
 * Additional checks: plausible AWS id prefixes, security group list, IPv4 SSH CIDR when set.
 */
export function validateWizardForPreview(state: WizardState): {
  ok: boolean;
  fields: Partial<Record<WizardFieldErrorKey, string>>;
} {
  const fields: Partial<Record<WizardFieldErrorKey, string>> = {};

  const framework = state.framework as Framework | "";
  if (!framework || !FRAMEWORK_IDS.includes(framework as Framework)) {
    fields.framework = "Select an IaC framework.";
  }
  const allowedClouds: CloudId[] = ["aws", "gcp", "oci"];
  if (!state.cloud || !allowedClouds.includes(state.cloud as CloudId)) {
    fields.cloud = "Select a cloud (AWS, Google Cloud, or OCI).";
  }
  const isAws = (state.cloud as string) === "aws" || !state.cloud;

  const region = state.region.trim();
  if (!region) {
    fields.region = "Region is required.";
  }

  const subnet = state.subnet_id.trim();
  if (!subnet) {
    fields.subnet_id = "Subnet (or subnetwork) is required.";
  } else if (isAws && subnet.length >= 8 && !subnet.toLowerCase().startsWith("subnet-")) {
    fields.subnet_id = "AWS subnet ids usually start with subnet- (e.g. subnet-0abc12…).";
  }

  const instanceType = state.instance_type.trim();
  if (!instanceType) {
    fields.instance_type = "Instance type is required.";
  }

  const ami = state.ami.trim();
  if (!ami) {
    fields.ami = isAws ? "AMI ID is required." : "Image / OCID is required for this cloud.";
  } else if (isAws && ami.length >= 5 && !ami.toLowerCase().startsWith("ami-")) {
    fields.ami = "On AWS, AMI ids start with ami- (e.g. ami-0abc12…).";
  }

  for (const raw of state.security_group_ids) {
    const s = raw.trim();
    if (isAws && s && !/^sg-[a-f0-9-]+$/i.test(s)) {
      fields.security_group_ids = `“${s}” is not a valid AWS security group id; use values like sg-0abc12….`;
      break;
    }
  }

  const cidr = state.ssh_cidr.trim();
  if (cidr && !isPlausibleIpv4Cidr(cidr)) {
    fields.ssh_cidr = "Use an IPv4 CIDR, e.g. 203.0.113.10/32 (or leave empty).";
  }

  return { ok: Object.keys(fields).length === 0, fields };
}

function isPlausibleIpv4Cidr(s: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(s)) {
    return false;
  }
  const [ip, preStr] = s.split("/");
  const pfx = Number(preStr);
  if (Number.isNaN(pfx) || pfx < 0 || pfx > 32) {
    return false;
  }
  const octets = ip.split(".").map((x) => Number(x));
  if (octets.length !== 4) {
    return false;
  }
  return octets.every((n) => n >= 0 && n <= 255);
}
