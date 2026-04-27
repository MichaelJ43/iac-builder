/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cred from "@ui/credentialApi";
import { useCloudDiscovery } from "@ui/useCloudDiscovery";

describe("useCloudDiscovery", () => {
  beforeEach(() => {
    vi.spyOn(cred, "listNetworksForProfile").mockResolvedValue([{ id: "vpc-1", is_default: false }]);
    vi.spyOn(cred, "listKeyPairsForProfile").mockResolvedValue([{ name: "kp" }]);
    vi.spyOn(cred, "listAMISuggestionsForProfile").mockResolvedValue([{ id: "ami-1", name: "al2" }]);
    vi.spyOn(cred, "listSubnetsForProfile").mockResolvedValue([{ id: "sn-1", az: "use1-az1" }]);
    vi.spyOn(cred, "listSecurityGroupsForProfile").mockResolvedValue([{ id: "sg-1", name: "g" }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads vpcs and keys when profile and region set (AWS)", async () => {
    const { result, rerender } = renderHook(
      ({ cloud, pid, reg, vpc }: { cloud: string; pid: string; reg: string; vpc: string }) =>
        useCloudDiscovery(cloud as "aws", pid, reg, vpc),
      { initialProps: { cloud: "aws", pid: "", reg: "", vpc: "" } }
    );
    expect(result.current.vpcs).toEqual([]);
    rerender({ cloud: "aws", pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.vpcs.some((v) => v.id === "vpc-1")).toBe(true);
      },
      { timeout: 3000 }
    );
    expect(result.current.keyPairs).toEqual([{ name: "kp" }]);
  });

  it("loads subnets when vpc set (AWS)", async () => {
    const { result, rerender } = renderHook(
      ({ cloud, pid, reg, vpc }: { cloud: string; pid: string; reg: string; vpc: string }) =>
        useCloudDiscovery(cloud as "aws", pid, reg, vpc),
      { initialProps: { cloud: "aws", pid: "p1", reg: "us-east-1", vpc: "" } }
    );
    rerender({ cloud: "aws", pid: "p1", reg: "us-east-1", vpc: "vpc-1" });
    await waitFor(
      () => {
        expect(result.current.subnets.length).toBe(1);
      },
      { timeout: 3000 }
    );
  });

  it("sets loading true until the primary batch resolves (AWS)", async () => {
    type VPC = { id: string; is_default: boolean };
    type KP = { name: string };
    type AMI = { id: string; name: string };
    let resolveV!: (v: VPC[]) => void;
    let resolveK!: (v: KP[]) => void;
    let resolveA!: (v: AMI[]) => void;
    const pV = new Promise<VPC[]>((r) => {
      resolveV = r;
    });
    const pK = new Promise<KP[]>((r) => {
      resolveK = r;
    });
    const pA = new Promise<AMI[]>((r) => {
      resolveA = r;
    });
    vi.spyOn(cred, "listNetworksForProfile").mockReturnValue(pV);
    vi.spyOn(cred, "listKeyPairsForProfile").mockReturnValue(pK);
    vi.spyOn(cred, "listAMISuggestionsForProfile").mockReturnValue(pA);
    const { result, rerender } = renderHook(
      ({ cloud, pid, reg, vpc }: { cloud: string; pid: string; reg: string; vpc: string }) =>
        useCloudDiscovery(cloud as "aws", pid, reg, vpc),
      { initialProps: { cloud: "aws", pid: "", reg: "", vpc: "" } }
    );
    rerender({ cloud: "aws", pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.loading).toBe(true);
      },
      { timeout: 3000 }
    );
    resolveV([{ id: "vpc-1", is_default: false }]);
    resolveK([{ name: "kp" }]);
    resolveA([{ id: "ami-1", name: "al2" }]);
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.vpcs[0]?.id).toBe("vpc-1");
      },
      { timeout: 3000 }
    );
  });

  it("sets a discovery note for non-AWS targets (e.g. Kubernetes) without calling AWS APIs", async () => {
    const { result, rerender } = renderHook(
      ({ cloud, pid, reg, vpc }: { cloud: string; pid: string; reg: string; vpc: string }) =>
        useCloudDiscovery(cloud as "aws" | "k8s", pid, reg, vpc),
      { initialProps: { cloud: "k8s", pid: "p1", reg: "us-east-1", vpc: "" } }
    );
    rerender({ cloud: "k8s", pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.discoveryNote).toMatch(/not wired/);
        expect(cred.listNetworksForProfile).not.toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("sets error when networks call fails (AWS)", async () => {
    vi.spyOn(cred, "listNetworksForProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(cred, "listKeyPairsForProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(cred, "listAMISuggestionsForProfile").mockRejectedValue(new Error("network"));
    const { result, rerender } = renderHook(
      ({ cloud, pid, reg, vpc }: { cloud: string; pid: string; reg: string; vpc: string }) =>
        useCloudDiscovery(cloud as "aws", pid, reg, vpc),
      { initialProps: { cloud: "aws", pid: "", reg: "", vpc: "" } }
    );
    rerender({ cloud: "aws", pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.error).toMatch(/network/);
      },
      { timeout: 3000 }
    );
  });
});
