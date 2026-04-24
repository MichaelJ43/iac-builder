import { useId, useMemo, useState } from "react";
import type { WizardState } from "./api";
import { buildAiContextForAiAssist } from "./aiAssistPolicy";

const POLICY_MD =
  "https://github.com/MichaelJ43/iac-builder/blob/main/docs/ai-assist.md";

type Props = {
  state: WizardState;
};

/**
 * P1: policy surface + context preview. No model calls; CTA remains disabled
 * until a provider is integrated with explicit user action.
 */
export function AiAssistPanel({ state }: Props) {
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const ctx = useMemo(() => buildAiContextForAiAssist(state), [state]);
  const json = useMemo(() => JSON.stringify(ctx, null, 2), [ctx]);
  const ackId = useId();

  return (
    <div className="ai-assist">
      <button
        type="button"
        className="toolbar-btn m43-button ai-assist__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} optional AI assist (beta)
      </button>
      {open && (
        <div className="ai-assist__panel" role="region" aria-label="AI assist policy and context">
          <p className="help">
            This area is for a future <strong>opt-in</strong> assistant. Today it only shows a policy link and
            a preview of the JSON context. Read{" "}
            <a href={POLICY_MD} className="ai-assist__link" rel="noreferrer" target="_blank">
              Optional AI assist — policy
            </a>{" "}
            in the repository.
          </p>
          <ul className="ai-assist__list">
            <li>No call is made to a model from this app build unless a provider is added later with explicit user action.</li>
            <li>Never paste AWS access keys; the wizard should not store them. Context is only in-browser form fields.</li>
            <li>Review any future model output the same way you review generated code here.</li>
          </ul>
          <div className="ai-assist__context">
            <span className="ai-assist__context-label">Context preview (v{ctx.v})</span>
            <pre className="ai-assist__pre">{json}</pre>
          </div>
          <div className="ai-assist__ack">
            <label htmlFor={ackId} className="ai-assist__ack-label">
              <input
                id={ackId}
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />{" "}
              I have read the policy and understand a future provider would only receive a context like the preview
              (no automatic calls today).
            </label>
          </div>
          <button
            type="button"
            className="primary m43-button m43-button--primary"
            disabled
            title="Model provider is not connected in this build. The checkbox and preview ship first."
            aria-disabled="true"
          >
            Get AI suggestions
          </button>
          <p className="help">Provider wiring is planned; undo/redo and your form state are unchanged.</p>
        </div>
      )}
    </div>
  );
}
