import { withCredentials } from "./fetchWithCredentials";
import { normalizeFetchError } from "./fetchUtils";

const base = "";

export type Framework =
  | "terraform"
  | "cloudformation"
  | "pulumi"
  | "azure_bicep"
  | "aws_cdk";

/** Top five IaC targets supported by the wizard (order matches UI). */
export const FRAMEWORK_IDS: Framework[] = [
  "terraform",
  "cloudformation",
  "pulumi",
  "azure_bicep",
  "aws_cdk",
];

export type WizardState = {
  framework: Framework | "";
  cloud: string;
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
};

/** Default wizard used by the UI and preset coercion. */
export function emptyWizardState(): WizardState {
  return {
    framework: "",
    cloud: "aws",
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
  };
}

export async function preview(state: WizardState): Promise<Record<string, string>> {
  const res = await fetch(`${base}/api/v1/preview`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
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
  const res = await fetch(`${base}/api/v1/security/recommendations`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error(await normalizeFetchError(res));
  const data = (await res.json()) as { recommendations: SecurityRecommendation[] };
  return data.recommendations;
}
