import { useEffect, useState } from "react";
import type { CloudId } from "./api";
import { isAwsCloud } from "./cloudConstants";
import {
  listAMISuggestionsForProfile,
  listKeyPairsForProfile,
  listSecurityGroupsForProfile,
  listSubnetsForProfile,
  listNetworksForProfile,
  type AMIInfo,
  type KeyPairRow,
  type SGRow,
  type SubnetRow,
  type VPCRow,
} from "./credentialApi";

export type Discovery = {
  vpcs: VPCRow[];
  subnets: SubnetRow[];
  securityGroups: SGRow[];
  keyPairs: KeyPairRow[];
  amis: AMIInfo[];
  error: string | null;
  /** True while the region-scoped list (networks, key pairs, images) is loading. */
  loading: boolean;
  /** True while subnet and security group lists for the selected parent network are loading. */
  loadingSubnets: boolean;
  /** Set when a profile lists resources for a non-AWS cloud (live discovery is not available yet). */
  discoveryNote: string | null;
};

/**
 * Fetches read-only network/compute suggestions when a credential profile and region are set.
 * **AWS** uses the stored profile (encrypted access keys) for EC2/SSM discovery.
 * **GCP, OCI, Kubernetes, Ansible, and VMware** return empty lists with a note; enter values manually.
 */
export function useCloudDiscovery(
  cloud: CloudId | "",
  profileId: string,
  region: string,
  vpcId: string
): Discovery {
  const [vpcs, setVpcs] = useState<VPCRow[]>([]);
  const [subnets, setSubnets] = useState<SubnetRow[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SGRow[]>([]);
  const [keyPairs, setKeyPairs] = useState<KeyPairRow[]>([]);
  const [amis, setAmis] = useState<AMIInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSubnets, setLoadingSubnets] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const c = (cloud || "aws") as CloudId;
  const aws = isAwsCloud(cloud);
  const ready = profileId.trim() !== "" && region.trim() !== "" && aws;
  const vpcReady = ready && vpcId.trim() !== "";

  useEffect(() => {
    if (!aws) {
      setVpcs([]);
      setKeyPairs([]);
      setAmis([]);
      setNote(
        c === "gcp" || c === "oci" || c === "k8s" || c === "ansible" || c === "vmware"
          ? "Live list APIs are not wired for this target; credential profiles are AWS-only. Enter values manually, or use AWS for read-only suggestions."
          : null
      );
      setLoading(false);
      return;
    }
    if (!ready) {
      setVpcs([]);
      setKeyPairs([]);
      setAmis([]);
      setNote(null);
      setLoading(false);
      return;
    }
    setNote(null);
    setLoading(true);
    setError(null);
    let cancel = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const [v, k, a] = await Promise.all([
            listNetworksForProfile(profileId, region, "aws"),
            listKeyPairsForProfile(profileId, region),
            listAMISuggestionsForProfile(profileId, region, "aws"),
          ]);
          if (!cancel) {
            setVpcs(v);
            setKeyPairs(k);
            setAmis(a);
          }
        } catch (e) {
          if (!cancel) {
            setVpcs([]);
            setKeyPairs([]);
            setAmis([]);
            setError(e instanceof Error ? e.message : String(e));
          }
        } finally {
          if (!cancel) {
            setLoading(false);
          }
        }
      })();
    }, 350);
    return () => {
      cancel = true;
      clearTimeout(t);
      setLoading(false);
    };
  }, [profileId, region, ready, aws, c]);

  useEffect(() => {
    if (!aws) {
      setSubnets([]);
      setSecurityGroups([]);
      setLoadingSubnets(false);
      return;
    }
    if (!vpcReady) {
      setSubnets([]);
      setSecurityGroups([]);
      setLoadingSubnets(false);
      return;
    }
    setLoadingSubnets(true);
    let cancel = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const [s, g] = await Promise.all([
            listSubnetsForProfile(profileId, region, vpcId.trim(), "aws"),
            listSecurityGroupsForProfile(profileId, region, vpcId.trim(), "aws"),
          ]);
          if (!cancel) {
            setSubnets(s);
            setSecurityGroups(g);
          }
        } catch (e) {
          if (!cancel) {
            setSubnets([]);
            setSecurityGroups([]);
            setError(e instanceof Error ? e.message : String(e));
          }
        } finally {
          if (!cancel) {
            setLoadingSubnets(false);
          }
        }
      })();
    }, 300);
    return () => {
      cancel = true;
      clearTimeout(t);
      setLoadingSubnets(false);
    };
  }, [profileId, region, vpcId, vpcReady, aws]);

  return {
    vpcs,
    subnets,
    securityGroups,
    keyPairs,
    amis,
    error,
    loading,
    loadingSubnets,
    discoveryNote: note,
  };
}

/** @deprecated use useCloudDiscovery(cloud, …) */
export function useAwsDiscovery(profileId: string, region: string, vpcId: string): Discovery {
  return useCloudDiscovery("aws", profileId, region, vpcId);
}
