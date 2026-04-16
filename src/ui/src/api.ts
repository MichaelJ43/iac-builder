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

export async function preview(state: WizardState): Promise<Record<string, string>> {
  const res = await fetch(`${base}/api/v1/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { files: Record<string, string> };
  return data.files;
}

export async function securityRecommendations(
  state: WizardState
): Promise<{ id: string; severity: string; message: string }[]> {
  const res = await fetch(`${base}/api/v1/security/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { recommendations: { id: string; severity: string; message: string }[] };
  return data.recommendations;
}
