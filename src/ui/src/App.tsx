import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Framework, SecurityRecommendation, WizardState } from "./api";
import { emptyWizardState, preview, securityRecommendations } from "./api";
import { errorMessageFromUnknown } from "./fetchUtils";
import { PresetDiffTable } from "./PresetDiffTable";
import { getPresetWizard, listPresets, type PresetSummary } from "./presetApi";
import { useWizardUndoState } from "./useWizardUndoState";
import {
  buildWizardExport,
  parseWizardImport,
  readFileAsText,
  stringifyExport,
} from "./wizardExportImport";
import { getStarterTemplate, STARTER_TEMPLATES } from "./starterCatalog";

const frameworks: { id: Framework; label: string }[] = [
  { id: "terraform", label: "Terraform (HCL)" },
  { id: "cloudformation", label: "AWS CloudFormation" },
  { id: "pulumi", label: "Pulumi" },
  { id: "azure_bicep", label: "Azure Bicep" },
  { id: "aws_cdk", label: "AWS CDK" },
];

export function App() {
  const { state, setWizard: setState, replaceWithState, undo, redo, canUndo, canRedo } =
    useWizardUndoState(emptyWizardState());
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [hints, setHints] = useState<SecurityRecommendation[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [presetListErr, setPresetListErr] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [presetCompareErr, setPresetCompareErr] = useState<string | null>(null);
  const [diffBaseline, setDiffBaseline] = useState<WizardState | null>(null);
  const [diffBaselineName, setDiffBaselineName] = useState<string | null>(null);
  const [selectedStarterId, setSelectedStarterId] = useState("");
  const selectedStarter = useMemo(
    () => (selectedStarterId ? getStarterTemplate(selectedStarterId) : undefined),
    [selectedStarterId]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0 && !cancelled) {
            await new Promise((r) => setTimeout(r, 750));
          }
          const list = await listPresets();
          if (!cancelled) {
            setPresets(list);
            setPresetListErr(null);
          }
          return;
        } catch (e) {
          const msg = errorMessageFromUnknown(e);
          const transient = /502|503|504|Bad Gateway|Gateway Timeout|timeout/i.test(msg);
          if (attempt === 0 && transient && !cancelled) {
            continue;
          }
          if (!cancelled) {
            setPresetListErr(msg);
          }
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canShowCloud = state.framework !== "";
  const canShowRegion = canShowCloud;
  const canShowNetwork = state.region.trim() !== "";
  // Subnet is required for this EC2 template; VPC is optional (only used in Terraform comments / hints).
  const canShowCompute = state.subnet_id.trim() !== "";

  const readyForPreview =
    state.framework &&
    state.cloud === "aws" &&
    state.region &&
    state.subnet_id &&
    state.instance_type &&
    state.ami;

  const refresh = useCallback(async () => {
    if (!readyForPreview) {
      setPreviewText("");
      setHints([]);
      return;
    }
    try {
      setErr(null);
      const files = await preview(state);
      const primary = files["main.tf"] ?? files["template.yaml"] ?? Object.values(files)[0] ?? "";
      setPreviewText(primary);
      const recs = await securityRecommendations(state);
      setHints(recs);
    } catch (e) {
      setErr(errorMessageFromUnknown(e));
    }
  }, [state, readyForPreview]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 350);
    return () => clearTimeout(t);
  }, [refresh]);

  const sgText = useMemo(
    () => state.security_group_ids.join(","),
    [state.security_group_ids]
  );

  const exportConfiguration = useCallback(() => {
    setImportErr(null);
    const body = stringifyExport(buildWizardExport(state));
    const blob = new Blob([body], { type: "application/json" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "iac-builder-wizard.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const onImportFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) {
        return;
      }
      setImportErr(null);
      void (async () => {
        try {
          const text = await readFileAsText(file);
          const next = parseWizardImport(text);
          replaceWithState(next);
        } catch (err) {
          setImportErr(errorMessageFromUnknown(err));
        }
      })();
    },
    [replaceWithState]
  );

  const loadStarterTemplate = useCallback(() => {
    const t = getStarterTemplate(selectedStarterId);
    if (!t) {
      return;
    }
    setImportErr(null);
    replaceWithState(structuredClone(t.state));
  }, [selectedStarterId, replaceWithState]);

  return (
    <div className={`layout${sliderOpen ? " layout--sliderOpen" : ""}`}>
      <div className="main">
        <h1>iac-builder</h1>
        <p>Guided IaC for AWS EC2 (MVP). Pick a framework first.</p>
        <div className="wizard-toolbar">
          <button type="button" className="toolbar-btn" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="toolbar-btn" onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" className="toolbar-btn" onClick={exportConfiguration}>
            Export configuration
          </button>
          <input
            id="wizard-import-file"
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={onImportFileChange}
            tabIndex={-1}
          />
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => importFileRef.current?.click()}
            aria-label="Import configuration from a JSON file on your device"
          >
            Import configuration
          </button>
        </div>
        {importErr && <p className="message--error">{importErr}</p>}

        <div className="step starter-catalog">
          <label>Starter template (bundled)</label>
          <p className="help">
            Load a <strong>curated</strong> example end-to-end. Values use obvious placeholder AWS IDs; replace
            with real subnet, security group, and AMI in your account before you trust generated IaC in AWS.
          </p>
          <div className="preset-compare__row">
            <select
              value={selectedStarterId}
              onChange={(e) => setSelectedStarterId(e.target.value)}
              aria-label="Bundled starter template"
            >
              <option value="">Choose a starter…</option>
              {STARTER_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="toolbar-btn"
              disabled={!selectedStarterId}
              onClick={loadStarterTemplate}
            >
              Load starter
            </button>
          </div>
          {selectedStarter && <p className="help">{selectedStarter.description}</p>}
        </div>

        <div className="step preset-compare">
          <label>Compare wizard to saved preset</label>
          <p className="help">
            Pick a preset stored by the API, then <strong>Set baseline</strong>. The table updates as you edit the
            form; it does not change your answers.
          </p>
          {presetListErr && <p className="preset-compare__err">{presetListErr}</p>}
          <div className="preset-compare__row">
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              disabled={presets.length === 0}
              aria-label="Saved preset for comparison"
            >
              <option value="">
                {presetListErr
                  ? "Could not load presets"
                  : presets.length === 0
                    ? "No presets in API"
                    : "Select a preset…"}
              </option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="toolbar-btn"
              disabled={!selectedPresetId || compareLoading}
              onClick={() => {
                void (async () => {
                  setPresetCompareErr(null);
                  setCompareLoading(true);
                  try {
                    const w = await getPresetWizard(selectedPresetId);
                    const meta = presets.find((p) => p.id === selectedPresetId);
                    setDiffBaseline(w);
                    setDiffBaselineName(meta?.name ?? selectedPresetId);
                  } catch (e) {
                    setPresetCompareErr(errorMessageFromUnknown(e));
                  } finally {
                    setCompareLoading(false);
                  }
                })();
              }}
            >
              {compareLoading ? "Loading…" : "Set baseline"}
            </button>
          </div>
          {presetCompareErr && <p className="preset-compare__err">{presetCompareErr}</p>}
          {diffBaseline && diffBaselineName && (
            <PresetDiffTable
              name={diffBaselineName}
              baseline={diffBaseline}
              current={state}
              onClear={() => {
                setDiffBaseline(null);
                setDiffBaselineName(null);
              }}
            />
          )}
        </div>

        <p className="help">
          This flow targets a single <code>aws_instance</code> (or equivalent) in one region.{" "}
          <strong>Subnet</strong> is required so the instance has a network placement.{" "}
          <strong>VPC</strong> is optional here—Terraform still works without it; we only use it for
          comments and discovery context. Other resource types would skip subnet entirely; this MVP is EC2-only.
        </p>
        {err && <p className="message--error">{err}</p>}

        <div className="step">
          <label>IaC framework</label>
          <select
            aria-label="IaC framework"
            value={state.framework}
            onChange={(e) =>
              setState((s) => ({ ...s, framework: e.target.value as Framework }))
            }
          >
            <option value="">Select…</option>
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {canShowCloud && (
          <div className="step">
            <label>Cloud</label>
            <select
              value={state.cloud}
              onChange={(e) => setState((s) => ({ ...s, cloud: e.target.value }))}
            >
              <option value="aws">AWS</option>
            </select>
          </div>
        )}

        {canShowRegion && (
          <div className="step">
            <label>Region</label>
            <input
              value={state.region}
              onChange={(e) => setState((s) => ({ ...s, region: e.target.value }))}
              placeholder="us-east-1"
            />
          </div>
        )}

        {canShowNetwork && (
          <>
            <div className="step">
              <label>Subnet ID</label>
              <p className="help">
                Required for EC2: the subnet must live in <strong>{state.region || "your region"}</strong>.
                Example shape: <code>subnet-0abc123def4567890</code>. From AWS Console: VPC → Subnets → copy subnet ID.
                If you use a credential profile in the API, you can list subnets after validating the profile.
              </p>
              <input
                value={state.subnet_id}
                onChange={(e) => setState((s) => ({ ...s, subnet_id: e.target.value }))}
                placeholder="subnet-..."
              />
            </div>
            <div className="step">
              <label>VPC ID (optional)</label>
              <p className="help">
                Optional. Adds a comment in generated Terraform linking the subnet to a VPC for humans
                reviewing the file—not required for <code>terraform apply</code> when <code>subnet_id</code> is set.
                If <strong>Show code</strong> is open, it can sit on top of this area—close it or scroll to see this field.
              </p>
              <input
                value={state.vpc_id}
                onChange={(e) => setState((s) => ({ ...s, vpc_id: e.target.value }))}
                placeholder="vpc-... (optional)"
              />
            </div>
          </>
        )}

        {canShowCompute && (
          <>
            <div className="step">
              <label>Instance type</label>
              <input
                value={state.instance_type}
                onChange={(e) =>
                  setState((s) => ({ ...s, instance_type: e.target.value }))
                }
                placeholder="t3.micro"
              />
            </div>
            <div className="step">
              <label>AMI ID</label>
              <input
                value={state.ami}
                onChange={(e) => setState((s) => ({ ...s, ami: e.target.value }))}
                placeholder="ami-..."
              />
            </div>
            <div className="step">
              <label>Key name (optional)</label>
              <input
                value={state.key_name}
                onChange={(e) => setState((s) => ({ ...s, key_name: e.target.value }))}
              />
            </div>
            <div className="step">
              <label>Security group IDs (comma-separated)</label>
              <input
                value={sgText}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    security_group_ids: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="step">
              <label>
                <input
                  type="checkbox"
                  checked={state.associate_public_ip}
                  onChange={(e) =>
                    setState((s) => ({ ...s, associate_public_ip: e.target.checked }))
                  }
                />{" "}
                Associate public IP
              </label>
            </div>
            <div className="step">
              <label>
                <input
                  type="checkbox"
                  checked={state.imdsv2_required}
                  onChange={(e) =>
                    setState((s) => ({ ...s, imdsv2_required: e.target.checked }))
                  }
                />{" "}
                Require IMDSv2
              </label>
            </div>
            <div className="step">
              <label>SSH CIDR (for guidance)</label>
              <input
                value={state.ssh_cidr}
                onChange={(e) => setState((s) => ({ ...s, ssh_cidr: e.target.value }))}
                placeholder="203.0.113.10/32"
              />
            </div>
            <div className="step">
              <label>
                <input
                  type="checkbox"
                  checked={state.enable_ebs_encryption}
                  onChange={(e) =>
                    setState((s) => ({ ...s, enable_ebs_encryption: e.target.checked }))
                  }
                />{" "}
                Encrypt root EBS
              </label>
            </div>
          </>
        )}

        {hints.length > 0 && (
          <div className="hints">
            <strong>Security hints</strong>
            <ul className="hints-list">
              {hints.map((h) => (
                <li key={h.id} className={`hints-item hints-item--${h.severity}`}>
                  <div className="hints-item__title">
                    <span className="hints-item__severity">{h.severity}</span>
                    {h.message}
                  </div>
                  {h.tags && h.tags.length > 0 && (
                    <div className="hints-item__tags">{h.tags.join(" · ")}</div>
                  )}
                  {h.remediation && (
                    <details className="hints-item__remediation">
                      <summary>Remediation</summary>
                      <pre>{h.remediation}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        className="slider-tab"
        onClick={() => setSliderOpen((o) => !o)}
        aria-expanded={sliderOpen}
      >
        {sliderOpen ? "Hide code" : "Show code"}
      </button>
      <aside className={`slider ${sliderOpen ? "open" : ""}`}>
        <pre>{previewText || "// complete required fields to preview"}</pre>
      </aside>
    </div>
  );
}
