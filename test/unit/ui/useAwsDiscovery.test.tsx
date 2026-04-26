/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cred from "@ui/credentialApi";
import { useAwsDiscovery } from "@ui/useAwsDiscovery";

describe("useAwsDiscovery", () => {
  beforeEach(() => {
    vi.spyOn(cred, "listVPCsForProfile").mockResolvedValue([{ id: "vpc-1", is_default: false }]);
    vi.spyOn(cred, "listKeyPairsForProfile").mockResolvedValue([{ name: "kp" }]);
    vi.spyOn(cred, "listAMISuggestionsForProfile").mockResolvedValue([{ id: "ami-1", name: "al2" }]);
    vi.spyOn(cred, "listSubnetsForProfile").mockResolvedValue([{ id: "sn-1", az: "use1-az1" }]);
    vi.spyOn(cred, "listSecurityGroupsForProfile").mockResolvedValue([{ id: "sg-1", name: "g" }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads vpcs and keys when profile and region set", async () => {
    const { result, rerender } = renderHook(
      ({ pid, reg, vpc }: { pid: string; reg: string; vpc: string }) => useAwsDiscovery(pid, reg, vpc),
      { initialProps: { pid: "", reg: "", vpc: "" } }
    );
    expect(result.current.vpcs).toEqual([]);
    rerender({ pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.vpcs.some((v) => v.id === "vpc-1")).toBe(true);
      },
      { timeout: 3000 }
    );
    expect(result.current.keyPairs).toEqual([{ name: "kp" }]);
  });

  it("loads subnets when vpc set", async () => {
    const { result, rerender } = renderHook(
      ({ pid, reg, vpc }: { pid: string; reg: string; vpc: string }) => useAwsDiscovery(pid, reg, vpc),
      { initialProps: { pid: "p1", reg: "us-east-1", vpc: "" } }
    );
    rerender({ pid: "p1", reg: "us-east-1", vpc: "vpc-1" });
    await waitFor(
      () => {
        expect(result.current.subnets.length).toBe(1);
      },
      { timeout: 3000 }
    );
  });

  it("sets error when vpcs call fails", async () => {
    vi.spyOn(cred, "listVPCsForProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(cred, "listKeyPairsForProfile").mockRejectedValue(new Error("network"));
    vi.spyOn(cred, "listAMISuggestionsForProfile").mockRejectedValue(new Error("network"));
    const { result, rerender } = renderHook(
      ({ pid, reg, vpc }: { pid: string; reg: string; vpc: string }) => useAwsDiscovery(pid, reg, vpc),
      { initialProps: { pid: "", reg: "", vpc: "" } }
    );
    rerender({ pid: "p1", reg: "us-east-1", vpc: "" });
    await waitFor(
      () => {
        expect(result.current.error).toMatch(/network/);
      },
      { timeout: 3000 }
    );
  });
});
