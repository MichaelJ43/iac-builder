import { emptyWizardState, FRAMEWORK_IDS, type Framework, type WizardState } from "./api";

const base = "";

export type PresetSummary = {
  id: string;
  name: string;
  created_at: string;
};

/** Normalize JSON from `GET /api/v1/presets/{id}` into a `WizardState`. */
export function coerceWizardState(raw: unknown): WizardState {
  const d = emptyWizardState();
  if (!raw || typeof raw !== "object") {
    return d;
  }
  const o = raw as Record<string, unknown>;
  const root =
    o.state !== undefined && typeof o.state === "object" && o.state !== null
      ? (o.state as Record<string, unknown>)
      : o;

  const fw = root.framework;
  let framework: WizardState["framework"] = d.framework;
  if (fw === "") {
    framework = "";
  } else if (typeof fw === "string" && (FRAMEWORK_IDS as readonly string[]).includes(fw)) {
    framework = fw as Framework;
  }

  const cloud = typeof root.cloud === "string" ? root.cloud : d.cloud;
  const region = typeof root.region === "string" ? root.region : d.region;
  const vpc_id = typeof root.vpc_id === "string" ? root.vpc_id : d.vpc_id;
  const subnet_id = typeof root.subnet_id === "string" ? root.subnet_id : d.subnet_id;
  const instance_type = typeof root.instance_type === "string" ? root.instance_type : d.instance_type;
  const ami = typeof root.ami === "string" ? root.ami : d.ami;
  const key_name = typeof root.key_name === "string" ? root.key_name : d.key_name;
  const ssh_cidr = typeof root.ssh_cidr === "string" ? root.ssh_cidr : d.ssh_cidr;

  let security_group_ids = d.security_group_ids;
  if (Array.isArray(root.security_group_ids)) {
    security_group_ids = root.security_group_ids.filter((x): x is string => typeof x === "string");
  }

  return {
    framework,
    cloud,
    region,
    vpc_id,
    subnet_id,
    instance_type,
    ami,
    key_name,
    security_group_ids,
    associate_public_ip:
      typeof root.associate_public_ip === "boolean" ? root.associate_public_ip : d.associate_public_ip,
    imdsv2_required: typeof root.imdsv2_required === "boolean" ? root.imdsv2_required : d.imdsv2_required,
    enable_ebs_encryption:
      typeof root.enable_ebs_encryption === "boolean"
        ? root.enable_ebs_encryption
        : d.enable_ebs_encryption,
    ssh_cidr,
  };
}

export async function listPresets(): Promise<PresetSummary[]> {
  const res = await fetch(`${base}/api/v1/presets`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as { presets?: PresetSummary[] };
  return data.presets ?? [];
}

export async function getPresetWizard(id: string): Promise<WizardState> {
  const res = await fetch(`${base}/api/v1/presets/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return coerceWizardState(await res.json());
}
