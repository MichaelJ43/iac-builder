import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCredentialProfile,
  deleteCredentialProfile,
  fetchAuthStatus,
  listAMISuggestionsForProfile,
  listCredentialProfiles,
  listKeyPairsForProfile,
  listSecurityGroupsForProfile,
  listSubnetsForProfile,
  listVPCsForProfile,
} from "@ui/credentialApi";
import { createAppFetchMock, urlString } from "./testFetchMock";

describe("credentialApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createAppFetchMock());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchAuthStatus returns disabled", async () => {
    const s = await fetchAuthStatus();
    expect(s.kind).toBe("disabled");
  });

  it("fetchAuthStatus returns signedOut on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => "",
      }))
    );
    const s = await fetchAuthStatus();
    expect(s.kind).toBe("signedOut");
  });

  it("fetchAuthStatus returns signedIn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ auth: "enabled", user_id: "user-z" }),
        text: async () => "",
      }))
    );
    const s = await fetchAuthStatus();
    expect(s.kind).toBe("signedIn");
    if (s.kind === "signedIn") {
      expect(s.userId).toBe("user-z");
    }
  });

  it("listCredentialProfiles parses array", async () => {
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const u = urlString(input);
      if (u.includes("/profiles") && !u.includes("/aws/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            profiles: [{ id: "1", name: "a", cloud: "aws", default_region: "us-east-1", created_at: "t" }],
          }),
          text: async () => "",
        };
      }
      return createAppFetchMock()(input);
    });
    vi.stubGlobal("fetch", f);
    const p = await listCredentialProfiles();
    expect(p).toHaveLength(1);
    expect(p[0]!.name).toBe("a");
  });

  it("createCredentialProfile returns id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({ id: "new-id" }),
        text: async () => "",
      }))
    );
    const id = await createCredentialProfile({
      name: "n",
      default_region: "us-east-1",
      access_key_id: "A",
      secret_access_key: "B",
    });
    expect(id).toBe("new-id");
  });

  it("deleteCredentialProfile succeeds on 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => "",
      }))
    );
    await expect(deleteCredentialProfile("pid-1")).resolves.toBeUndefined();
  });

  it("deleteCredentialProfile throws on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => "not found",
      }))
    );
    await expect(deleteCredentialProfile("missing")).rejects.toThrow(/profile not found/);
  });

  it("discovery helpers parse json", async () => {
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const u = urlString(input);
      if (u.includes("/discovery/networks")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            networks: [{ id: "vpc-1", is_default: true, cloud: "aws" }],
          }),
          text: async () => "",
        };
      }
      if (u.includes("/discovery/subnets")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ subnets: [{ id: "sub-1", zone: "a" }] }),
          text: async () => "",
        };
      }
      if (u.includes("/discovery/security-groups")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ security_groups: [{ id: "sg-1", name: "default" }] }),
          text: async () => "",
        };
      }
      if (u.includes("/key-pairs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ key_pairs: [{ name: "kp" }] }),
          text: async () => "",
        };
      }
      if (u.includes("/discovery/compute-images")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ images: [{ id: "ami-1", name: "al2" }] }),
          text: async () => "",
        };
      }
      return createAppFetchMock()(input);
    });
    vi.stubGlobal("fetch", f);
    await expect(listVPCsForProfile("pid", "us-east-1")).resolves.toEqual([
      { id: "vpc-1", is_default: true },
    ]);
    await expect(listSubnetsForProfile("pid", "us-east-1", "vpc-1")).resolves.toEqual([
      { id: "sub-1", az: "a" },
    ]);
    await expect(listSecurityGroupsForProfile("pid", "us-east-1", "vpc-1")).resolves.toEqual([
      { id: "sg-1", name: "default" },
    ]);
    await expect(listKeyPairsForProfile("pid", "us-east-1")).resolves.toEqual([{ name: "kp" }]);
    await expect(listAMISuggestionsForProfile("pid", "us-east-1")).resolves.toEqual([
      { id: "ami-1", name: "al2" },
    ]);
  });
});
