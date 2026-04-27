/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { emptyWizardState, type WizardState } from "@ui/api";
import { useWizardUndoState } from "@ui/useWizardUndoState";

const empty = (): WizardState => emptyWizardState();

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
      result.current.setWizard((s) => ({ ...s, regions: ["us-west-2"], region: "us-west-2" }));
    });
    expect(result.current.state.regions).toEqual(["us-west-2"]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state.regions).toEqual([]);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.state.regions).toEqual(["us-west-2"]);
  });

  it("undo without waiting flush still commits burst", () => {
    const { result } = renderHook(() => useWizardUndoState(empty()));

    act(() => {
      result.current.setWizard((s) => ({ ...s, regions: ["eu-central-1"], region: "eu-central-1" }));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.state.regions).toEqual([]);
  });

  it("replaceWithState clears undo/redo and sets present", () => {
    const { result } = renderHook(() => useWizardUndoState(empty()));

    act(() => {
      result.current.setWizard((s) => ({ ...s, regions: ["ap-south-1"], region: "ap-south-1" }));
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.canUndo).toBe(true);

    const next: WizardState = { ...empty(), framework: "pulumi", regions: ["us-west-1"], region: "us-west-1" };
    act(() => {
      result.current.replaceWithState(next);
    });
    expect(result.current.state).toEqual(next);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
