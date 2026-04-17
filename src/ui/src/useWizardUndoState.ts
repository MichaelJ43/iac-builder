import { useCallback, useReducer, useRef } from "react";
import type { WizardState } from "./api";
import {
  applyEdit,
  canRedo,
  canUndo,
  flushBurstStart,
  initialWizardHistory,
  redoHistory,
  undoHistory,
  type WizardHistoryState,
} from "./wizardHistory";

const DEBOUNCE_MS = 350;

type Action =
  | { type: "edit"; updater: (p: WizardState) => WizardState }
  | { type: "flush" }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: WizardHistoryState, action: Action): WizardHistoryState {
  switch (action.type) {
    case "edit":
      return applyEdit(state, action.updater);
    case "flush":
      return flushBurstStart(state);
    case "undo":
      return undoHistory(state);
    case "redo":
      return redoHistory(state);
  }
}

export function useWizardUndoState(initial: WizardState) {
  const [state, dispatch] = useReducer(reducer, initial, () => initialWizardHistory(initial));
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFlushTimer = useCallback(() => {
    if (flushTimer.current != null) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    clearFlushTimer();
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      dispatch({ type: "flush" });
    }, DEBOUNCE_MS);
  }, [clearFlushTimer]);

  const setWizard = useCallback(
    (update: WizardState | ((prev: WizardState) => WizardState)) => {
      dispatch({
        type: "edit",
        updater: (prev) =>
          typeof update === "function" ? (update as (p: WizardState) => WizardState)(prev) : update,
      });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const undo = useCallback(() => {
    clearFlushTimer();
    dispatch({ type: "undo" });
  }, [clearFlushTimer]);

  const redo = useCallback(() => {
    clearFlushTimer();
    dispatch({ type: "redo" });
  }, [clearFlushTimer]);

  return {
    state: state.present,
    setWizard,
    undo,
    redo,
    canUndo: canUndo(state),
    canRedo: canRedo(state),
  };
}
