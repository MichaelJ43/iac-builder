import { useMemo } from "react";
import type { WizardState } from "./api";
import { diffWizardStates } from "./wizardDiff";

type Props = {
  name: string;
  baseline: WizardState;
  current: WizardState;
  onClear: () => void;
};

export function PresetDiffTable({ name, baseline, current, onClear }: Props) {
  const rows = useMemo(() => diffWizardStates(baseline, current), [baseline, current]);

  return (
    <div className="preset-diff">
      <div className="preset-diff__head">
        <strong>Diff vs preset:</strong> {name}
        <button type="button" className="toolbar-btn m43-button preset-diff__clear" onClick={onClear}>
          Clear baseline
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="help">No differences — the wizard matches this preset.</p>
      ) : (
        <table className="preset-diff__table m43-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Preset</th>
              <th>Current</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>
                  <code>{r.baseline}</code>
                </td>
                <td>
                  <code>{r.current}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
