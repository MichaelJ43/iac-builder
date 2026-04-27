import { describe, it, expect } from "vitest";
import { emptyWizardState, type WizardState } from "@ui/api";
import {
  applyEdit,
  canRedo,
  canUndo,
  cloneWizard,
  commitBurst,
  flushBurstStart,
  initialWizardHistory,
  redoCore,
  redoHistory,
  undoCore,
  undoHistory,
  wizardStatesEqual,
} from "@ui/wizardHistory";

const base = (): WizardState => ({
  ...emptyWizardState(),
  framework: "terraform",
  cloud: "aws",
  regions: ["us-east-1"],
  region: "us-east-1",
  vpc_id: "",
  subnet_id: "subnet-a",
  instance_type: "t3.micro",
  ami: "ami-1",
  key_name: "",
  security_group_ids: [],
  associate_public_ip: false,
  imdsv2_required: false,
  ssh_cidr: "",
  enable_ebs_encryption: false,
  app_secretsmanager_secret_name: "",
  app_ssm_parameter_name: "",
});

describe("wizardHistory", () => {
  it("cloneWizard deep-clones", () => {
    const a = base();
    const b = cloneWizard(a);
    expect(b).toEqual(a);
    b.regions = ["eu-west-1"];
    b.region = "eu-west-1";
    expect(a.regions).toEqual(["us-east-1"]);
  });

  it("wizardStatesEqual compares serialized shape", () => {
    expect(wizardStatesEqual(base(), base())).toBe(true);
    expect(
      wizardStatesEqual(base(), { ...base(), regions: ["x"], region: "x" })
    ).toBe(false);
  });

  it("initialWizardHistory starts empty stacks", () => {
    const h = initialWizardHistory(base());
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(0);
    expect(h.burstStart).toBeNull();
    expect(h.present.framework).toBe("terraform");
  });

  it("commitBurst pushes snapshot when present changed", () => {
    const start = base();
    const c = {
      past: [],
      present: { ...start, regions: ["eu-west-1"], region: "eu-west-1" },
      future: [] as WizardState[],
    };
    const out = commitBurst(c, start);
    expect(out.past).toHaveLength(1);
    expect(wizardStatesEqual(out.past[0]!, start)).toBe(true);
    expect(out.present.region).toBe("eu-west-1");
    expect(out.future).toHaveLength(0);
  });

  it("commitBurst is noop when unchanged", () => {
    const s = base();
    const c = { past: [], present: s, future: [] };
    const out = commitBurst(c, s);
    expect(out.past).toHaveLength(0);
  });

  it("flushBurstStart clears burst when idle", () => {
    const h = initialWizardHistory(base());
    expect(flushBurstStart(h)).toBe(h);
  });

  it("undoCore and redoCore move snapshots", () => {
    const a = base();
    const b = { ...a, regions: ["eu-west-1"], region: "eu-west-1" };
    const c = { past: [a], present: b, future: [] as WizardState[] };
    const u = undoCore(c);
    expect(u.present.region).toBe("us-east-1");
    expect(u.future[0]?.region).toBe("eu-west-1");
    const r = redoCore(u);
    expect(r.present.region).toBe("eu-west-1");
    expect(r.past).toHaveLength(1);
  });

  it("undoCore is noop with empty past", () => {
    const c = { past: [] as WizardState[], present: base(), future: [] as WizardState[] };
    expect(undoCore(c)).toEqual(c);
  });

  it("redoCore is noop with empty future", () => {
    const c = { past: [] as WizardState[], present: base(), future: [] as WizardState[] };
    expect(redoCore(c)).toEqual(c);
  });

  it("applyEdit starts burst and clears redo on first keystroke", () => {
    const h = {
      ...initialWizardHistory(base()),
      future: [base()],
    };
    const next = applyEdit(h, (p) => ({ ...p, regions: ["eu-west-1"], region: "eu-west-1" }));
    expect(next.burstStart?.region).toBe("us-east-1");
    expect(next.present.regions).toEqual(["eu-west-1"]);
    expect(next.future).toHaveLength(0);
  });

  it("applyEdit keeps burst snapshot on follow-up edits", () => {
    let h = initialWizardHistory(base());
    h = applyEdit(h, (p) => ({ ...p, regions: ["a"], region: "a" }));
    h = applyEdit(h, (p) => ({ ...p, regions: ["ab"], region: "ab" }));
    expect(h.burstStart?.region).toBe("us-east-1");
    expect(h.present.regions).toEqual(["ab"]);
  });

  it("undoHistory flushes burst then pops past", () => {
    let h = initialWizardHistory(base());
    h = applyEdit(h, (p) => ({ ...p, regions: ["x"], region: "x" }));
    h = flushBurstStart(h);
    expect(h.past).toHaveLength(1);
    h = undoHistory(h);
    expect(h.present.regions).toEqual(["us-east-1"]);
    expect(h.future).toHaveLength(1);
  });

  it("redoHistory reapplies future head", () => {
    let h = initialWizardHistory(base());
    h = applyEdit(h, (p) => ({ ...p, regions: ["x"], region: "x" }));
    h = flushBurstStart(h);
    h = undoHistory(h);
    h = redoHistory(h);
    expect(h.present.regions).toEqual(["x"]);
    expect(h.future).toHaveLength(0);
  });

  it("canUndo reflects pending burst", () => {
    let h = initialWizardHistory(base());
    expect(canUndo(h)).toBe(false);
    h = applyEdit(h, (p) => ({ ...p, regions: ["z"], region: "z" }));
    expect(canUndo(h)).toBe(true);
  });

  it("canRedo requires future entries", () => {
    const h = initialWizardHistory(base());
    expect(canRedo(h)).toBe(false);
    expect(canRedo({ ...h, future: [base()] })).toBe(true);
  });
});
