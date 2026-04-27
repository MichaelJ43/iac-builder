import { withCredentials } from "./fetchWithCredentials";
import { normalizeFetchError } from "./fetchUtils";
import { normalizeWizardStateForAPI } from "./wizardRegions";

const base = "";

export type CloudId = "aws" | "gcp" | "oci" | "k8s" | "ansible" | "vmware";

export type Framework =
  | "terraform"
  | "opentofu"
  | "cloudformation"
  | "pulumi"
  | "azure_bicep"
  | "aws_cdk"
  | "crossplane";

/** IaC targets supported by the wizard (order matches UI). */
export const FRAMEWORK_IDS: Framework[] = [
  "terraform",
  "opentofu",
  "cloudformation",
  "pulumi",
  "azure_bicep",
  "aws_cdk",
  "crossplane",
];

export type WizardState = {
  framework: Framework | "";
  cloud: CloudId | "";
  /** Target regions; first is used for AWS discovery. Kept in sync with legacy `region`. */
  regions: string[];
  region: string;
  vpc_id: string;
  subnet_id: string;
  instance_type: string;
  ami: string;
  key_name: string;
  security_group_ids: string[];
  associate_public_ip: boolean;
  imdsv2_required: boolean;
  ssh_cidr: string;
  enable_ebs_encryption: boolean;
  /** Existing Secrets Manager secret *name* (not value) for app runtime; Terraform adds a data source. */
  app_secretsmanager_secret_name: string;
  /** Existing SSM parameter path for app runtime; Terraform adds a data source. */
  app_ssm_parameter_name: string;
};

/** Default wizard used by the UI and preset coercion. */
export function emptyWizardState(): WizardState {
  return {
    framework: "",
    cloud: "aws" satisfies CloudId,
    regions: [],
    region: "",
    vpc_id: "",
    subnet_id: "",
    instance_type: "",
    ami: "",
    key_name: "",
    security_group_ids: [],
    associate_public_ip: false,
    imdsv2_required: false,
    ssh_cidr: "",
    enable_ebs_encryption: false,
    app_secretsmanager_secret_name: "",
    app_ssm_parameter_name: "",
  };
}

export type OperatorGuardsStatus = {
  block_ssh_open_world: boolean;
  require_imdsv2: boolean;
  require_ebs_encryption: boolean;
  block_associate_public_ip: boolean;
  any_enabled: boolean;
};

export async function fetchOperatorGuards(): Promise<OperatorGuardsStatus> {
  const res = await fetch(`${base}/api/v1/operator/guards`, withCredentials);
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  return (await res.json()) as OperatorGuardsStatus;
}

/** P9: deployment region, multi-region catalog, hosted posture, telemetry opt-in (server + client). */
export type OperationsInfo = {
  app_version: string;
  region: {
    current: string;
    enabled: string[];
    catalog: string[];
    current_in_enabled: boolean;
  };
  telemetry: {
    server_opt_in: boolean;
    instructions: string;
  };
  posture: {
    data_residency: string;
    tls_terminated: boolean;
    hosted_readiness: string;
  };
};

export async function fetchOperationsInfo(): Promise<OperationsInfo> {
  const res = await fetch(`${base}/api/v1/operations`, withCredentials);
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  return (await res.json()) as OperationsInfo;
}

export async function preview(state: WizardState): Promise<Record<string, string>> {
  const stateOut = normalizeWizardStateForAPI(state);
  const res = await fetch(`${base}/api/v1/preview`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: stateOut }),
  });
  if (!res.ok) throw new Error(await normalizeFetchError(res));
  const data = (await res.json()) as { files: Record<string, string> };
  return data.files;
}

export type SecurityRecommendation = {
  id: string;
  severity: string;
  message: string;
  remediation?: string;
  tags?: string[];
};

export async function securityRecommendations(state: WizardState): Promise<SecurityRecommendation[]> {
  const stateOut = normalizeWizardStateForAPI(state);
  const res = await fetch(`${base}/api/v1/security/recommendations`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: stateOut }),
  });
  if (!res.ok) throw new Error(await normalizeFetchError(res));
  const data = (await res.json()) as { recommendations: SecurityRecommendation[] };
  return data.recommendations;
}
