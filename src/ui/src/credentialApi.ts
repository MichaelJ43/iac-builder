import { withCredentials } from "./fetchWithCredentials";
import { normalizeFetchError } from "./fetchUtils";

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
export type SGRow = { id: string; name: string };
export type KeyPairRow = { name: string };
export type AMIInfo = { id: string; name: string };

export async function listVPCsForProfile(profileId: string, region: string): Promise<VPCRow[]> {
  const q = new URLSearchParams({ region });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/aws/vpcs?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { vpcs?: VPCRow[] };
  return data.vpcs ?? [];
}

export async function listSubnetsForProfile(
  profileId: string,
  region: string,
  vpcId: string
): Promise<SubnetRow[]> {
  const q = new URLSearchParams({ region, vpc_id: vpcId });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/aws/subnets?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { subnets?: SubnetRow[] };
  return data.subnets ?? [];
}

export async function listSecurityGroupsForProfile(
  profileId: string,
  region: string,
  vpcId: string
): Promise<SGRow[]> {
  const q = new URLSearchParams({ region, vpc_id: vpcId });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/aws/security-groups?${q}`,
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
  region: string
): Promise<AMIInfo[]> {
  const q = new URLSearchParams({ region });
  const res = await fetch(
    `${base}/api/v1/profiles/${encodeURIComponent(profileId)}/aws/ami-suggestions?${q}`,
    withCredentials
  );
  if (!res.ok) {
    throw new Error(await normalizeFetchError(res));
  }
  const data = (await res.json()) as { amis?: AMIInfo[] };
  return data.amis ?? [];
}
