import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { WizardState } from "./api";
import {
  deleteOpenAIKey,
  getOpenAIKeyStatus,
  postAiAssist,
  putOpenAIKey,
} from "./aiAssistApi";
import { buildAiContextForAiAssist } from "./aiAssistPolicy";
import type { AuthStatus } from "./credentialApi";
import { errorMessageFromUnknown } from "./fetchUtils";

const POLICY_MD =
  "https://github.com/MichaelJ43/iac-builder/blob/main/docs/ai-assist.md";

type Props = {
  state: WizardState;
  authStatus: AuthStatus | null;
};

/**
 * BYOK OpenAI key (encrypted on server) + user-triggered POST /api/v1/ai/assist.
 */
export function AiAssistPanel({ state, authStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyStatus, setKeyStatus] = useState<"unknown" | "no" | "yes">("unknown");
  const [keyLast4, setKeyLast4] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const ctx = useMemo(() => buildAiContextForAiAssist(state), [state]);
  const json = useMemo(() => JSON.stringify(ctx, null, 2), [ctx]);
  const ackId = useId();
  const canStoreKey =
    authStatus === null
      ? false
      : authStatus.kind === "disabled" || authStatus.kind === "signedIn";
  const mustSignIn = authStatus !== null && authStatus.kind === "signedOut";
  const canSend = ack && !busy && !mustSignIn;

  const refreshKey = useCallback(async () => {
    if (!canStoreKey) {
      setKeyStatus("no");
      setKeyLast4(null);
      return;
    }
    try {
      const s = await getOpenAIKeyStatus();
      if (s.configured) {
        setKeyStatus("yes");
        setKeyLast4(s.key_last4);
      } else {
        setKeyStatus("no");
        setKeyLast4(null);
      }
    } catch (e) {
      setKeyStatus("no");
      setKeyLast4(null);
    }
  }, [canStoreKey]);

  useEffect(() => {
    if (open && canStoreKey) {
      void refreshKey();
    }
  }, [open, canStoreKey, refreshKey]);

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
            Bring your own <strong>OpenAI API key</strong> (BYOK). Keys are <strong>encrypted on the server</strong> with
            the same app master key as AWS profiles. The <strong>operator does not pay</strong> for model calls—you use
            your key and billing. Read{" "}
            <a href={POLICY_MD} className="ai-assist__link" rel="noreferrer" target="_blank">
              Optional AI assist — policy
            </a>
            .
          </p>
          {mustSignIn && (
            <p className="message--error m43-message--error ai-assist__err">
              Sign in to save an API key and request suggestions on this host.
            </p>
          )}
          {canStoreKey && (
            <div className="ai-assist__byok m43-field">
              <label htmlFor="ai-openai-key">OpenAI API key (BYOK)</label>
              <p className="help">
                Paste a key from https://platform.openai.com (starts with <code>sk-</code>). It is not shown again after
                save.
              </p>
              {keyStatus === "yes" && keyLast4 && (
                <p className="help" aria-live="polite">
                  Key on file: <code>sk-…{keyLast4}</code>
                </p>
              )}
              <div className="ai-assist__key-row">
                <input
                  id="ai-openai-key"
                  className="m43-input"
                  type="password"
                  autoComplete="off"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-…"
                  disabled={keyBusy}
                  aria-label="OpenAI API key"
                />
                <button
                  type="button"
                  className="toolbar-btn m43-button"
                  disabled={keyBusy || !keyInput.trim()}
                  onClick={() => {
                    setKeyBusy(true);
                    setErr(null);
                    void (async () => {
                      try {
                        await putOpenAIKey(keyInput.trim());
                        setKeyInput("");
                        await refreshKey();
                      } catch (e) {
                        setErr(errorMessageFromUnknown(e));
                      } finally {
                        setKeyBusy(false);
                      }
                    })();
                  }}
                >
                  Save key
                </button>
                <button
                  type="button"
                  className="toolbar-btn m43-button"
                  disabled={keyBusy || keyStatus !== "yes"}
                  onClick={() => {
                    if (!window.confirm("Remove the saved OpenAI key for this app?")) {
                      return;
                    }
                    setKeyBusy(true);
                    setErr(null);
                    void (async () => {
                      try {
                        await deleteOpenAIKey();
                        await refreshKey();
                      } catch (e) {
                        setErr(errorMessageFromUnknown(e));
                      } finally {
                        setKeyBusy(false);
                      }
                    })();
                  }}
                >
                  Remove key
                </button>
              </div>
            </div>
          )}
          <ul className="ai-assist__list">
            <li>Requests are user-triggered; the server rate-limits and validates the v1 context.</li>
            <li>Never paste AWS access keys; only wizard fields and your optional OpenAI key (for BYOK) go to the server.</li>
            <li>Review all model output like any generated code.</li>
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
                  setSuggestions(null);
                }}
              />{" "}
              I have read the policy and understand a suggestion request sends the JSON above to the API, and if I saved
              a key, my key is used to call OpenAI.
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
              setSuggestions(null);
              setBusy(true);
              void (async () => {
                try {
                  const r = await postAiAssist(ctx);
                  setResultMsg(r.message);
                  setSuggestions(r.suggestions && r.suggestions.trim() !== "" ? r.suggestions : null);
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
          {suggestions && <pre className="ai-assist__suggest">{suggestions}</pre>}
          <p className="help">Undo/redo and your form state are unchanged.</p>
        </div>
      )}
    </div>
  );
}
