import { withCredentials } from "./fetchWithCredentials";
import { normalizeFetchError } from "./fetchUtils";
import type { CloudId } from "./api";

const base = "";

export type AuthStatus =
  | { kind: "disabled" }
  | { kind: "signedIn"; userId: string }
  | { kind: "signedOut" };

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${base}/api/v1/auth/status`, withCredentials);
  if (res.status === 401) {
    return { kind: "signedOut" };
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const d = (await res.json()) as { auth?: string; user_id?: string };
  if (d.auth === "disabled") {
    return { kind: "disabled" };
  }
  if (d.user_id) {
    return { kind: "signedIn", userId: d.user_id };
  }
  return { kind: "signedOut" };
}

export type ProfileSummary = {
  id: string;
  name: string;
  cloud: string;
  default_region: string;
  created_at: string;
};

export async function listCredentialProfiles(): Promise<ProfileSummary[]> {
  const res = await fetch(`${base}/api/v1/profiles`, withCredentials);
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { profiles?: ProfileSummary[] };
  return data.profiles ?? [];
}

export async function createCredentialProfile(body: {
  name: string;
  default_region: string;
  access_key_id: string;
  secret_access_key: string;
}): Promise<string> {
  const res = await fetch(`${base}/api/v1/profiles`, {
    ...withCredentials,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name,
      cloud: "aws",
      default_region: body.default_region,
      access_key_id: body.access_key_id,
      secret_access_key: body.secret_access_key,
    }),
  });
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error("missing id in response");
  }
  return data.id;
}

export async function deleteCredentialProfile(id: string): Promise<void> {
  const res = await fetch(`${base}/api/v1/profiles/${encodeURIComponent(id)}`, {
    ...withCredentials,
    method: "DELETE",
  });
  if (res.status === 404) {
    throw new Error("profile not found");
  }
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
}

export type VPCRow = { id: string; is_default: boolean };
export type SubnetRow = { id: string; az: string };
/** Shared discovery: subnet zone (maps to "az" in the UI for AWS). */
export type NetworkAPIModel = { id: string; display_name?: string; is_default: boolean; cloud: string; region?: string };
export type SGRow = { id: string; name: string };
export type KeyPairRow = { name: string };
export type AMIInfo = { id: string; name: string };

export async function listNetworksForProfile(
  profileId: string,
  region: string,
  cloud: CloudId
): Promise<VPCRow[]> {
  const q = new URLSearchParams({ region, cloud });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/discovery/networks?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { networks?: NetworkAPIModel[] };
  return (data.networks ?? []).map((n) => ({ id: n.id, is_default: n.is_default }));
}

export async function listVPCsForProfile(profileId: string, region: string): Promise<VPCRow[]> {
  return listNetworksForProfile(profileId, region, "aws");
}

export async function listSubnetsForProfile(
  profileId: string,
  region: string,
  vpcId: string,
  cloud: CloudId = "aws"
): Promise<SubnetRow[]> {
  const q = new URLSearchParams({ region, network_id: vpcId, cloud });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/discovery/subnets?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { subnets?: { id: string; zone: string }[] };
  return (data.subnets ?? []).map((s) => ({ id: s.id, az: s.zone }));
}

export async function listSecurityGroupsForProfile(
  profileId: string,
  region: string,
  vpcId: string,
  cloud: CloudId = "aws"
): Promise<SGRow[]> {
  const q = new URLSearchParams({ region, network_id: vpcId, cloud });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/discovery/security-groups?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { security_groups?: SGRow[] };
  return data.security_groups ?? [];
}

export async function listKeyPairsForProfile(profileId: string, region: string): Promise<KeyPairRow[]> {
  const q = new URLSearchParams({ region });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/aws/key-pairs?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { key_pairs?: KeyPairRow[] };
  return data.key_pairs ?? [];
}

export async function listAMISuggestionsForProfile(
  profileId: string,
  region: string,
  cloud: CloudId = "aws"
): Promise<AMIInfo[]> {
  const q = new URLSearchParams({ region, cloud });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/discovery/compute-images?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { images?: { id: string; name: string }[] };
  return (data.images ?? []).map((i) => ({ id: i.id, name: i.name }));
}
