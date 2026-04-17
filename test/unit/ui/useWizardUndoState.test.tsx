/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { WizardState } from "@ui/api";
import { useWizardUndoState } from "@ui/useWizardUndoState";

const empty = (): WizardState => ({
  framework: "",
  cloud: "aws",
  region: "",
  vpc_id: "",
  subnet_id: "",
  instance_type: "",
  ami: "",
  key_name: "",
  security_group_ids: [],
  associate_public_ip: false,
  imdsv2_required: false,
  ssh_cidr: "",
  enable_ebs_encryption: false,
});

describe("useWizardUndoState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounced flush records history then undo restores", () => {
    const { result } = renderHook(() => useWizardUndoState(empty()));

    act(() => {
      result.current.setWizard((s) => ({ ...s, region: "us-west-2" }));
    });
    expect(result.current.state.region).toBe("us-west-2");
    expect(result.current.canUndo).toBe(true);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state.region).toBe("");
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.state.region).toBe("us-west-2");
  });

  it("undo without waiting flush still commits burst", () => {
    const { result } = renderHook(() => useWizardUndoState(empty()));

    act(() => {
      result.current.setWizard((s) => ({ ...s, region: "eu-central-1" }));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.state.region).toBe("");
  });
});
