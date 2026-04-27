import type { WizardState } from "./api";
import { targetRegionsFromState } from "./wizardRegions";

/**
 * Bumped when the **shape** of the AI context object changes. Review
 * docs/ai-assist.md when incrementing.
 */
export const AI_ASSIST_CONTEXT_VERSION = 2 as const;

/**
 * Opaque, JSON-friendly object intended for a future opt-in model call.
 * Values are in-browser wizard fields only (no app secrets, no API keys).
 */
export type AiAssistContextV1 = {
  v: typeof AI_ASSIST_CONTEXT_VERSION;
  app: "iac-builder";
  /** SHA-256 prefix of a stable JSON of wizard fields — for log correlation without PII, optional use */
  stateSummaryLabel: string;
  wizard: {
    framework: string;
    cloud: string;
    /** Target region ids (e.g. multiple AWS regions). */
    regions: string[];
    region: string;
    /** Resource identifiers; not secret access keys. */
    vpc_id: string;
    subnet_id: string;
    instance_type: string;
    ami: string;
    /** EC2 key pair *name* (resource name), not a private key. */
    key_name: string;
    security_group_count: number;
    associate_public_ip: boolean;
    imdsv2_required: boolean;
    enable_ebs_encryption: boolean;
    /** Whether ssh_cidr is set (boolean only — avoids shipping full CIDR in a tight policy mode later). */
    ssh_cidr_configured: boolean;
    /** Whether app secret *names* (not values) are configured for IaC data sources. */
    app_runtime_secret_ref_configured: boolean;
  };
};

function shortStateHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33 + s.charCodeAt(i)) | 0;
  }
  const x = (h >>> 0).toString(16);
  return x.length >= 8 ? x.slice(0, 8) : x.padStart(8, "0");
}

/**
 * Produces a versioned object safe to show in the UI and (later) to send under policy.
 */
export function buildAiContextForAiAssist(state: WizardState): AiAssistContextV1 {
  const tr = targetRegionsFromState(state);
  const sm = state.app_secretsmanager_secret_name.trim();
  const ssm = state.app_ssm_parameter_name.trim();
  const basis = JSON.stringify({
    f: state.framework,
    c: state.cloud,
    r: tr.join(",") || state.region,
    v: state.vpc_id,
    s: state.subnet_id,
    t: state.instance_type,
    a: state.ami,
    k: state.key_name,
    g: state.security_group_ids,
    p: state.associate_public_ip,
    i: state.imdsv2_required,
    e: state.enable_ebs_encryption,
    ssh: state.ssh_cidr,
    sm: sm,
    ssm: ssm,
  });
  return {
    v: AI_ASSIST_CONTEXT_VERSION,
    app: "iac-builder",
    stateSummaryLabel: `wizard:${shortStateHash(basis)}`,
    wizard: {
      framework: state.framework,
      cloud: state.cloud,
      regions: tr,
      region: tr[0] ?? state.region,
      vpc_id: state.vpc_id,
      subnet_id: state.subnet_id,
      instance_type: state.instance_type,
      ami: state.ami,
      key_name: state.key_name,
      security_group_count: state.security_group_ids.length,
      associate_public_ip: state.associate_public_ip,
      imdsv2_required: state.imdsv2_required,
      enable_ebs_encryption: state.enable_ebs_encryption,
      ssh_cidr_configured: state.ssh_cidr.trim() !== "",
      app_runtime_secret_ref_configured: sm !== "" || ssm !== "",
    },
  };
}
