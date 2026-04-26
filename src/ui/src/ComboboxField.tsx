import { type ReactNode, useId } from "react";

type Opt = { value: string; label?: string };

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: Opt[];
  help?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Suggestions list is being refreshed (e.g. AWS discovery). */
  busy?: boolean;
  /** Inline validation message (also sets aria-invalid on the input). */
  error?: string;
  "aria-label"?: string;
};

/**
 * Free-text field with optional datalist suggestions (native combobox).
 */
export function ComboboxField(p: Props) {
  const listId = useId();
  const errId = useId();
  const dis = p.disabled === true;
  const busy = p.busy === true;
  const err = p.error?.trim() ?? "";
  return (
    <div className="step m43-field">
      <label>{p.label}</label>
      {p.help && <p className="help">{p.help}</p>}
      <input
        className={busy ? "m43-input m43-input--busy" : "m43-input"}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
        disabled={dis}
        list={listId}
        aria-busy={busy}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? errId : undefined}
        aria-label={p["aria-label"] ?? p.label}
      />
      <datalist id={listId}>
        {p.suggestions.map((o) => (
          <option key={o.value} value={o.value} label={o.label} />
        ))}
      </datalist>
      {err ? (
        <p id={errId} className="message--error m43-message--error m43-field__error" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
