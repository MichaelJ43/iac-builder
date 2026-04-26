import { useId, useMemo, useState } from "react";
import type { WizardState } from "./api";
import { postAiAssist } from "./aiAssistApi";
import { buildAiContextForAiAssist } from "./aiAssistPolicy";
import { errorMessageFromUnknown } from "./fetchUtils";

const POLICY_MD =
  "https://github.com/MichaelJ43/iac-builder/blob/main/docs/ai-assist.md";

type Props = {
  state: WizardState;
};

/**
 * Policy + context preview; user-triggered POST to /api/v1/ai/assist (stub until a model is configured).
 */
export function AiAssistPanel({ state }: Props) {
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const ctx = useMemo(() => buildAiContextForAiAssist(state), [state]);
  const json = useMemo(() => JSON.stringify(ctx, null, 2), [ctx]);
  const ackId = useId();
  const canSend = ack && !busy;

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
            This area is for an <strong>opt-in</strong> assistant. <strong>Get AI suggestions</strong>{" "}
            sends the JSON below to the API (no third-party model in default deployments). Read{" "}
            <a href={POLICY_MD} className="ai-assist__link" rel="noreferrer" target="_blank">
              Optional AI assist — policy
            </a>{" "}
            in the repository.
          </p>
          <ul className="ai-assist__list">
            <li>Requests are user-triggered only; the server rate-limits and validates the v1 context shape.</li>
            <li>Never paste AWS access keys; the wizard should not store them. Context is only in-browser form fields.</li>
            <li>Review any model output the same way you review generated code here.</li>
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
                onChange={(e) => {
                  setAck(e.target.checked);
                  setErr(null);
                  setResultMsg(null);
                }}
              />{" "}
              I have read the policy and understand a request sends the preview context to this app’s API
              (rate-limited; no model until configured server-side).
            </label>
          </div>
          <button
            type="button"
            className="primary m43-button m43-button--primary"
            disabled={!canSend}
            title={!ack ? "Confirm you have read the policy first." : undefined}
            onClick={() => {
              setErr(null);
              setResultMsg(null);
              setBusy(true);
              void (async () => {
                try {
                  const r = await postAiAssist(ctx);
                  setResultMsg(r.message);
                } catch (e) {
                  setErr(errorMessageFromUnknown(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? "Requesting…" : "Get AI suggestions"}
          </button>
          {err && <p className="message--error m43-message--error ai-assist__err">{err}</p>}
          {resultMsg && <p className="ai-assist__result">{resultMsg}</p>}
          <p className="help">Undo/redo and your form state are unchanged. Configure a model provider server-side to get real suggestions.</p>
        </div>
      )}
    </div>
  );
}
