import type { WizardState } from "./api";

export type WizardHistoryCore = {
  past: WizardState[];
  present: WizardState;
  future: WizardState[];
};

export type WizardHistoryState = WizardHistoryCore & {
  /** Snapshot at the start of the current debounced burst; `null` when idle. */
  burstStart: WizardState | null;
};

export function cloneWizard(s: WizardState): WizardState {
  return structuredClone(s);
}

export function wizardStatesEqual(a: WizardState, b: WizardState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function initialWizardHistory(initial: WizardState): WizardHistoryState {
  return {
    past: [],
    present: cloneWizard(initial),
    future: [],
    burstStart: null,
  };
}

/** If the burst diverged from its snapshot, push the snapshot to `past` and clear redo. */
export function commitBurst(c: WizardHistoryCore, burstStart: WizardState): WizardHistoryCore {
  if (wizardStatesEqual(burstStart, c.present)) {
    return c;
  }
  return {
    past: [...c.past, cloneWizard(burstStart)],
    present: c.present,
    future: [],
  };
}

export function flushBurstStart(state: WizardHistoryState): WizardHistoryState {
  if (state.burstStart == null) {
    return state;
  }
  const core = commitBurst(
    { past: state.past, present: state.present, future: state.future },
    state.burstStart
  );
  return { ...core, burstStart: null };
}

export function undoCore(c: WizardHistoryCore): WizardHistoryCore {
  if (c.past.length === 0) {
    return c;
  }
  const prev = c.past[c.past.length - 1]!;
  return {
    past: c.past.slice(0, -1),
    present: cloneWizard(prev),
    future: [cloneWizard(c.present), ...c.future],
  };
}

export function redoCore(c: WizardHistoryCore): WizardHistoryCore {
  if (c.future.length === 0) {
    return c;
  }
  const [next, ...rest] = c.future;
  return {
    past: [...c.past, cloneWizard(c.present)],
    present: cloneWizard(next!),
    future: rest,
  };
}

export function applyEdit(
  state: WizardHistoryState,
  updater: (p: WizardState) => WizardState
): WizardHistoryState {
  const next = updater(state.present);
  if (state.burstStart != null) {
    return { ...state, present: next };
  }
  return {
    ...state,
    burstStart: cloneWizard(state.present),
    present: next,
    future: [],
  };
}

export function undoHistory(state: WizardHistoryState): WizardHistoryState {
  const flushed = flushBurstStart(state);
  const core = undoCore({
    past: flushed.past,
    present: flushed.present,
    future: flushed.future,
  });
  return { ...core, burstStart: null };
}

export function redoHistory(state: WizardHistoryState): WizardHistoryState {
  const flushed = flushBurstStart(state);
  const core = redoCore({
    past: flushed.past,
    present: flushed.present,
    future: flushed.future,
  });
  return { ...core, burstStart: null };
}

export function canUndo(state: WizardHistoryState): boolean {
  if (state.burstStart != null && !wizardStatesEqual(state.burstStart, state.present)) {
    return true;
  }
  return state.past.length > 0;
}

export function canRedo(state: WizardHistoryState): boolean {
  return state.future.length > 0;
}
