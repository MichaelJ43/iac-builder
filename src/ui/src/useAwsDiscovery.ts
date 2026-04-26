import { useEffect, useState } from "react";
import {
  listAMISuggestionsForProfile,
  listKeyPairsForProfile,
  listSecurityGroupsForProfile,
  listSubnetsForProfile,
  listVPCsForProfile,
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
};

/**
 * Fetches suggestible AWS resources when a credential profile and region are set.
 * Subnets and security groups require a VPC id.
 */
export function useAwsDiscovery(
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

  const ready = profileId.trim() !== "" && region.trim() !== "";
  const vpcReady = ready && vpcId.trim() !== "";

  useEffect(() => {
    if (!ready) {
      setVpcs([]);
      return;
    }
    let cancel = false;
    const t = setTimeout(() => {
      setError(null);
      void (async () => {
        try {
          const [v, k, a] = await Promise.all([
            listVPCsForProfile(profileId, region),
            listKeyPairsForProfile(profileId, region),
            listAMISuggestionsForProfile(profileId, region),
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
        }
      })();
    }, 350);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [profileId, region, ready]);

  useEffect(() => {
    if (!vpcReady) {
      setSubnets([]);
      setSecurityGroups([]);
      return;
    }
    let cancel = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const [s, g] = await Promise.all([
            listSubnetsForProfile(profileId, region, vpcId.trim()),
            listSecurityGroupsForProfile(profileId, region, vpcId.trim()),
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
        }
      })();
    }, 300);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [profileId, region, vpcId, vpcReady]);

  return {
    vpcs,
    subnets,
    securityGroups,
    keyPairs,
    amis,
    error,
  };
}
