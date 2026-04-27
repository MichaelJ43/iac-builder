import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emptyWizardState } from "@ui/api";
import {
  coerceWizardState,
  createWizardPreset,
  deletePreset,
  getPresetWizard,
  listPresets,
  parsePresetLabelsInput,
} from "@ui/presetApi";

describe("parsePresetLabelsInput", () => {
  it("splits and lowercases", () => {
    expect(parsePresetLabelsInput("A, b;  C ")).toEqual(["a", "b", "c"]);
  });
  it("returns empty for blank", () => {
    expect(parsePresetLabelsInput("  ")).toEqual([]);
  });
});

describe("coerceWizardState", () => {
  it("returns defaults for non-objects", () => {
    expect(coerceWizardState(null).region).toBe("");
    expect(coerceWizardState(undefined).cloud).toBe("aws");
    expect(coerceWizardState("x").framework).toBe("");
  });

  it("reads nested state wrapper", () => {
    const w = coerceWizardState({
      state: { region: "ap-south-1", framework: "pulumi", cloud: "aws" },
    });
    expect(w.region).toBe("ap-south-1");
    expect(w.framework).toBe("pulumi");
  });

  it("ignores invalid framework strings", () => {
    const w = coerceWizardState({ framework: "not-a-real-fw", region: "us-east-1" });
    expect(w.framework).toBe("");
    expect(w.region).toBe("us-east-1");
  });

  it("accepts each supported framework id", () => {
    for (const fw of ["terraform", "cloudformation", "pulumi", "azure_bicep", "aws_cdk"] as const) {
      expect(coerceWizardState({ framework: fw }).framework).toBe(fw);
    }
  });

  it("coerces explicit empty framework", () => {
    expect(coerceWizardState({ framework: "" }).framework).toBe("");
  });

  it("maps security_group_ids when present", () => {
    const w = coerceWizardState({
      security_group_ids: ["sg-2", "sg-1"],
    });
    expect(w.security_group_ids).toEqual(["sg-2", "sg-1"]);
  });

  it("uses root when state is null", () => {
    const w = coerceWizardState({ state: null, region: "ca-central-1" } as unknown);
    expect(w.region).toBe("ca-central-1");
  });

  it("falls back when booleans are not boolean", () => {
    const w = coerceWizardState({
      associate_public_ip: "yes" as unknown as boolean,
      imdsv2_required: 1 as unknown as boolean,
      enable_ebs_encryption: null as unknown as boolean,
    });
    expect(w.associate_public_ip).toBe(false);
    expect(w.imdsv2_required).toBe(false);
    expect(w.enable_ebs_encryption).toBe(false);
  });

  it("ignores non-array security_group_ids", () => {
    const w = coerceWizardState({ security_group_ids: "sg-1" as unknown as string[] });
    expect(w.security_group_ids).toEqual([]);
  });

  it("uses root when state is not an object", () => {
    const w = coerceWizardState({ state: "wrapped", region: "us-west-2" } as unknown);
    expect(w.region).toBe("us-west-2");
  });

  it("preserves true booleans from JSON", () => {
    const w = coerceWizardState({
      associate_public_ip: true,
      imdsv2_required: true,
      enable_ebs_encryption: true,
    });
    expect(w.associate_public_ip).toBe(true);
    expect(w.imdsv2_required).toBe(true);
    expect(w.enable_ebs_encryption).toBe(true);
  });
});

describe("listPresets", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ presets: [{ id: "1", name: "A", created_at: "t" }] }),
      }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns presets array", async () => {
    const p = await listPresets();
    expect(p).toHaveLength(1);
    expect(p[0]?.id).toBe("1");
  });

  it("defaults missing presets to empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      }))
    );
    expect(await listPresets()).toEqual([]);
  });

  it("throws when list response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => "nope",
      }))
    );
    await expect(listPresets()).rejects.toThrow("nope");
  });
});

describe("getPresetWizard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => "missing",
      }))
    );
    await expect(getPresetWizard("x")).rejects.toThrow("missing");
  });

  it("parses JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ region: "eu-central-1", framework: "terraform" }),
      }))
    );
    const w = await getPresetWizard("abc");
    expect(w.region).toBe("eu-central-1");
    expect(w.framework).toBe("terraform");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("/presets/abc");
  });
});

describe("createWizardPreset", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs state wrapper and returns id", async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ id: "new-1" }),
    }));
    vi.stubGlobal("fetch", f);
    const id = await createWizardPreset("my-preset", emptyWizardState());
    expect(id).toBe("new-1");
    const arg = f.mock.calls[0]?.[1] as RequestInit;
    expect(arg?.method).toBe("POST");
    const body = JSON.parse(String(arg?.body));
    expect(body.name).toBe("my-preset");
    expect(body.data.state).toBeDefined();
    expect(body.data.format_version).toBe(1);
  });

  it("throws when id missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({}),
      }))
    );
    await expect(createWizardPreset("x", emptyWizardState())).rejects.toThrow(/missing id/);
  });
});

describe("deletePreset", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs preset", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal("fetch", f);
    await expect(deletePreset("abc")).resolves.toBeUndefined();
    expect(f.mock.calls[0]?.[0]).toContain("/presets/abc");
    expect((f.mock.calls[0]?.[1] as RequestInit)?.method).toBe("DELETE");
  });
});
