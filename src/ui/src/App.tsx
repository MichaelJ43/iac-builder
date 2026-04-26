import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Framework, SecurityRecommendation, WizardState } from "./api";
import { emptyWizardState, preview, securityRecommendations } from "./api";
import { AWS_REGIONS, INSTANCE_TYPE_SUGGESTIONS } from "./awsConstants";
import { ComboboxField } from "./ComboboxField";
import { fetchAuthStatus, listCredentialProfiles, type AuthStatus, type ProfileSummary } from "./credentialApi";
import { errorMessageFromUnknown } from "./fetchUtils";
import { PresetDiffTable } from "./PresetDiffTable";
import {
  createWizardPreset,
  deletePreset,
  getPresetWizard,
  listPresets,
  type PresetSummary,
} from "./presetApi";
import { useAwsDiscovery } from "./useAwsDiscovery";
import { useWizardUndoState } from "./useWizardUndoState";
import {
  buildWizardExport,
  parseWizardImport,
  readFileAsText,
  stringifyExport,
} from "./wizardExportImport";
import { getStarterTemplate, STARTER_TEMPLATES } from "./starterCatalog";
import { AiAssistPanel } from "./AiAssistPanel";
import { isAiAssistUIEnabled } from "./flags";
import { ManageProfilesModal } from "./ManageProfilesModal";

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
  const presetImportFileRef = useRef<HTMLInputElement | null>(null);
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
  /** When the diff baseline was loaded from a stored preset, its id (used to clear diff if preset is deleted). */
  const [diffBaselinePresetId, setDiffBaselinePresetId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetSaveBusy, setPresetSaveBusy] = useState(false);
  const [presetDeleteBusy, setPresetDeleteBusy] = useState(false);
  const [presetApplyBusy, setPresetApplyBusy] = useState(false);
  const [presetDownloadBusy, setPresetDownloadBusy] = useState(false);
  const [presetActionErr, setPresetActionErr] = useState<string | null>(null);
  const [selectedStarterId, setSelectedStarterId] = useState("");
  const selectedStarter = useMemo(
    () => (selectedStarterId ? getStarterTemplate(selectedStarterId) : undefined),
    [selectedStarterId]
  );

  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [profileListErr, setProfileListErr] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

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

  useEffect(() => {
    void (async () => {
      try {
        const a = await fetchAuthStatus();
        setAuthStatus(a);
      } catch {
        setAuthStatus({ kind: "disabled" });
      }
    })();
  }, []);

  useEffect(() => {
    if (authStatus === null) {
      return;
    }
    if (authStatus.kind === "signedOut") {
      setProfiles([]);
      setProfileListErr(null);
      setSelectedProfileId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await listCredentialProfiles();
        if (!cancelled) {
          setProfiles(list);
          setProfileListErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setProfileListErr(errorMessageFromUnknown(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const discovery = useAwsDiscovery(selectedProfileId, state.region, state.vpc_id);

  const regionOpts = useMemo(() => AWS_REGIONS.map((v) => ({ value: v })), []);
  const vpcOpts = useMemo(
    () =>
      discovery.vpcs.map((v) => ({
        value: v.id,
        label: v.is_default ? `${v.id} (default VPC)` : v.id,
      })),
    [discovery.vpcs]
  );
  const subnetOpts = useMemo(
    () => discovery.subnets.map((s) => ({ value: s.id, label: `${s.id} (${s.az})` })),
    [discovery.subnets]
  );
  const instOpts = useMemo(() => INSTANCE_TYPE_SUGGESTIONS.map((v) => ({ value: v })), []);
  const amiOpts = useMemo(
    () => discovery.amis.map((a) => ({ value: a.id, label: `${a.id} — ${a.name}` })),
    [discovery.amis]
  );
  const keyOpts = useMemo(
    () => discovery.keyPairs.map((k) => ({ value: k.name })),
    [discovery.keyPairs]
  );
  const sgOpts = useMemo(
    () =>
      discovery.securityGroups.map((g) => ({
        value: g.id,
        label: g.name ? `${g.id} (${g.name})` : g.id,
      })),
    [discovery.securityGroups]
  );

  const canShowCloud = state.framework !== "";
  const canShowRegion = canShowCloud;
  const canShowNetwork = state.region.trim() !== "";
  const canShowCompute = state.subnet_id.trim() !== "";
  const canSaveProfile =
    authStatus !== null && (authStatus.kind === "disabled" || authStatus.kind === "signedIn");

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

  const selectProfile = useCallback(
    (id: string) => {
      setSelectedProfileId(id);
      if (!id) {
        return;
      }
      const p = profiles.find((x) => x.id === id);
      if (p?.default_region) {
        setState((s) => ({
          ...s,
          region: s.region.trim() ? s.region : p.default_region!,
        }));
      }
    },
    [profiles, setState]
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

  const refreshPresets = useCallback(async () => {
    try {
      const list = await listPresets();
      setPresets(list);
      setPresetListErr(null);
    } catch (e) {
      setPresetListErr(errorMessageFromUnknown(e));
    }
  }, []);

  const saveCurrentAsPreset = useCallback(() => {
    setPresetActionErr(null);
    const name = newPresetName.trim();
    if (!name) {
      setPresetActionErr("Enter a name for the preset.");
      return;
    }
    setPresetSaveBusy(true);
    void (async () => {
      try {
        const id = await createWizardPreset(name, state);
        setNewPresetName("");
        await refreshPresets();
        setSelectedPresetId(id);
      } catch (e) {
        setPresetActionErr(errorMessageFromUnknown(e));
      } finally {
        setPresetSaveBusy(false);
      }
    })();
  }, [newPresetName, state, refreshPresets]);

  const onPresetImportFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) {
        return;
      }
      setPresetActionErr(null);
      setPresetSaveBusy(true);
      void (async () => {
        try {
          const text = await readFileAsText(file);
          const w = parseWizardImport(text);
          const fromField = newPresetName.trim();
          const base = file.name.replace(/[/\\]/g, "/").split("/").pop() ?? file.name;
          const fromFile = base.replace(/\.json$/i, "").trim();
          const name = fromField || fromFile;
          if (!name) {
            setPresetActionErr(
              "Enter a name in the field, or choose a .json file whose name can be used as the preset name (e.g. my-preset.json)."
            );
            return;
          }
          const id = await createWizardPreset(name, w);
          setNewPresetName("");
          await refreshPresets();
          setSelectedPresetId(id);
        } catch (err) {
          setPresetActionErr(errorMessageFromUnknown(err));
        } finally {
          setPresetSaveBusy(false);
        }
      })();
    },
    [newPresetName, refreshPresets]
  );

  const deleteSelectedPreset = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    if (!window.confirm("Delete this preset from the server? This cannot be undone.")) {
      return;
    }
    setPresetActionErr(null);
    setPresetDeleteBusy(true);
    void (async () => {
      const id = selectedPresetId;
      try {
        await deletePreset(id);
        if (diffBaselinePresetId === id) {
          setDiffBaseline(null);
          setDiffBaselineName(null);
          setDiffBaselinePresetId(null);
        }
        setSelectedPresetId("");
        await refreshPresets();
      } catch (e) {
        setPresetActionErr(errorMessageFromUnknown(e));
      } finally {
        setPresetDeleteBusy(false);
      }
    })();
  }, [selectedPresetId, diffBaselinePresetId, refreshPresets]);

  const loadSelectedPresetIntoWizard = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    if (
      !window.confirm(
        "Replace the current wizard with this preset? You can use Undo to restore the previous state."
      )
    ) {
      return;
    }
    setPresetActionErr(null);
    setPresetApplyBusy(true);
    void (async () => {
      try {
        const w = await getPresetWizard(selectedPresetId);
        replaceWithState(structuredClone(w));
        setDiffBaseline(null);
        setDiffBaselineName(null);
        setDiffBaselinePresetId(null);
        setPresetCompareErr(null);
      } catch (e) {
        setPresetActionErr(errorMessageFromUnknown(e));
      } finally {
        setPresetApplyBusy(false);
      }
    })();
  }, [selectedPresetId, replaceWithState]);

  const downloadSelectedPresetAsJson = useCallback(() => {
    if (!selectedPresetId) {
      return;
    }
    setPresetActionErr(null);
    setPresetDownloadBusy(true);
    void (async () => {
      try {
        const w = await getPresetWizard(selectedPresetId);
        const meta = presets.find((p) => p.id === selectedPresetId);
        const body = stringifyExport(buildWizardExport(w));
        const blob = new Blob([body], { type: "application/json" });
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        const raw = meta?.name?.trim() || "preset";
        const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "preset";
        a.download = `iac-builder-preset-${safe}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setPresetActionErr(errorMessageFromUnknown(e));
      } finally {
        setPresetDownloadBusy(false);
      }
    })();
  }, [selectedPresetId, presets]);

  const toolbarButtonClass = "toolbar-btn m43-button";
  const fieldClass = "step m43-field";
  const inputClass = "m43-input";
  const errorClass = "message--error m43-message--error";

  return (
    <div className="layout">
      <main className="main m43-main">
        <header className="m43-site-header">
          <h1>iac-builder</h1>
          <p className="m43-intro">Guided IaC for AWS EC2 (MVP). Pick a framework first.</p>
        </header>
        <div className="wizard-toolbar">
          <button type="button" className={toolbarButtonClass} onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className={toolbarButtonClass} onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" className={toolbarButtonClass} onClick={exportConfiguration}>
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
            className={toolbarButtonClass}
            onClick={() => importFileRef.current?.click()}
            aria-label="Import configuration from a JSON file on your device"
          >
            Import configuration
          </button>
        </div>
        {importErr && <p className={errorClass}>{importErr}</p>}

        <div className={`${fieldClass} starter-catalog`}>
          <label>Starter template (bundled)</label>
          <p className="help">
            Load a <strong>curated</strong> example end-to-end. Values use obvious placeholder AWS IDs; replace
            with real subnet, security group, and AMI in your account before you trust generated IaC in AWS.
          </p>
          <div className="preset-compare__row">
            <select
              className={inputClass}
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
              className={toolbarButtonClass}
              disabled={!selectedStarterId}
              onClick={loadStarterTemplate}
            >
              Load starter
            </button>
          </div>
          {selectedStarter && <p className="help">{selectedStarter.description}</p>}
        </div>

        <div className={`${fieldClass} preset-compare`}>
          <label>Saved API presets</label>
          <p className="help">
            Presets are stored on the server. <strong>Load into wizard</strong> replaces your answers (Undo
            reverts). <strong>Set baseline</strong> diffs without changing the form.             <strong>Download as JSON</strong> uses the same file shape as <strong>Export configuration</strong> for
            sharing. <strong>Create from JSON file</strong> uploads a v1 file to the API. <strong>Delete</strong>{" "}
            removes a preset from the API.
          </p>
          {presetListErr && <p className="preset-compare__err m43-message--error">{presetListErr}</p>}
          {presetActionErr && <p className="preset-compare__err m43-message--error">{presetActionErr}</p>}
          <div className="preset-compare__row">
            <select
              className={inputClass}
              value={selectedPresetId}
              onChange={(e) => {
                setSelectedPresetId(e.target.value);
                setPresetActionErr(null);
              }}
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
              className={toolbarButtonClass}
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
                    setDiffBaselinePresetId(selectedPresetId);
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
            <button
              type="button"
              className={toolbarButtonClass}
              disabled={!selectedPresetId || presetApplyBusy}
              onClick={loadSelectedPresetIntoWizard}
            >
              {presetApplyBusy ? "Loading…" : "Load into wizard"}
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              disabled={!selectedPresetId || presetDownloadBusy}
              onClick={downloadSelectedPresetAsJson}
            >
              {presetDownloadBusy ? "Preparing…" : "Download as JSON"}
            </button>
            <button
              type="button"
              className="toolbar-btn m43-button toolbar-btn--danger"
              disabled={!selectedPresetId || presetDeleteBusy}
              onClick={deleteSelectedPreset}
            >
              {presetDeleteBusy ? "Deleting…" : "Delete preset"}
            </button>
          </div>
          <p className="help">
            Create a new preset from the <strong>current wizard</strong> or a <strong>v1 JSON file</strong> (export /
            download format). The name field is optional for file import: if empty, the file’s basename (without{" "}
            <code>.json</code>) is used.
          </p>
          <div className="preset-compare__row">
            <input
              className={inputClass}
              value={newPresetName}
              onChange={(e) => {
                setNewPresetName(e.target.value);
                setPresetActionErr(null);
              }}
              placeholder="Name for this preset"
              autoComplete="off"
              aria-label="Name for new server preset"
              disabled={presetSaveBusy}
            />
            <input
              id="preset-import-json"
              ref={presetImportFileRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              onChange={onPresetImportFileChange}
            />
            <button
              type="button"
              className={toolbarButtonClass}
              disabled={presetSaveBusy}
              onClick={saveCurrentAsPreset}
            >
              {presetSaveBusy ? "Saving…" : "Save to API as preset"}
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              disabled={presetSaveBusy}
              onClick={() => presetImportFileRef.current?.click()}
              aria-label="Create API preset from a v1 JSON file on your device"
            >
              {presetSaveBusy ? "Saving…" : "Create from JSON file"}
            </button>
          </div>
          {presetCompareErr && <p className="preset-compare__err m43-message--error">{presetCompareErr}</p>}
          {diffBaseline && diffBaselineName && (
            <PresetDiffTable
              name={diffBaselineName}
              baseline={diffBaseline}
              current={state}
              onClear={() => {
                setDiffBaseline(null);
                setDiffBaselineName(null);
                setDiffBaselinePresetId(null);
              }}
            />
          )}
        </div>

        {authStatus?.kind === "signedOut" && (
          <p className="help">
            <strong>AWS discovery</strong> and saving credential profiles to this app require a session. Use{" "}
            <strong>Log in</strong> in the top bar, then return here. You can still type resource IDs by hand
            without logging in.
          </p>
        )}

        {authStatus !== null && (authStatus.kind === "disabled" || authStatus.kind === "signedIn") && (
          <div className={fieldClass}>
            <label>AWS credential profile (API)</label>
            <p className="help">
              Keys are <strong>encrypted on the server</strong> and never shown again. Choose a profile to
              auto-suggest VPCs, subnets, and related IDs, or add and remove profiles in the manager. You can
              always type custom values; lists are optional hints.
            </p>
            {profileListErr && <p className={errorClass}>{profileListErr}</p>}
            {discovery.error && <p className={errorClass}>{discovery.error}</p>}
            <div className="profile-inline">
              <p className="profile-inline__summary" aria-live="polite">
                {activeProfile ? (
                  <>
                    Using{" "}
                    <strong>
                      {activeProfile.name}{" "}
                      <span className="profile-inline__region">({activeProfile.default_region || "—"})</span>
                    </strong>
                  </>
                ) : (
                  <span className="profile-inline__none">No profile — manual AWS IDs only</span>
                )}
              </p>
              <button
                type="button"
                className={toolbarButtonClass}
                onClick={() => setProfileModalOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={profileModalOpen}
                aria-controls="profile-modal"
              >
                Manage profiles
              </button>
            </div>
            <ManageProfilesModal
              open={profileModalOpen}
              onClose={() => setProfileModalOpen(false)}
              canSave={canSaveProfile}
              authStatus={authStatus}
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              onSelectProfile={selectProfile}
              onProfilesRefreshed={setProfiles}
            />
          </div>
        )}

        <p className="help">
          This flow targets a single <code>aws_instance</code> (or equivalent) in one region.{" "}
          <strong>Subnet</strong> is required so the instance has a network placement.{" "}
          <strong>VPC</strong> is optional in generated Terraform; choosing one unlocks better subnet and security
          group suggestions.
        </p>
        {err && <p className={errorClass}>{err}</p>}

        <div className={fieldClass}>
          <label>IaC framework</label>
          <select
            className={inputClass}
            aria-label="IaC framework"
            value={state.framework}
            onChange={(e) => setState((s) => ({ ...s, framework: e.target.value as Framework }))}
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
          <div className={fieldClass}>
            <label>Cloud</label>
            <select
              className={inputClass}
              value={state.cloud}
              onChange={(e) => setState((s) => ({ ...s, cloud: e.target.value }))}
            >
              <option value="aws">AWS</option>
            </select>
          </div>
        )}

        {canShowRegion && (
          <ComboboxField
            label="Region"
            value={state.region}
            onChange={(v) => setState((s) => ({ ...s, region: v }))}
            suggestions={regionOpts}
            placeholder="us-east-1"
            help={<>Type any region; the list is a shortcut for common values.</>}
            aria-label="AWS region"
          />
        )}

        {canShowNetwork && (
          <>
            <ComboboxField
              label="VPC ID (optional)"
              value={state.vpc_id}
              onChange={(v) => setState((s) => ({ ...s, vpc_id: v }))}
              suggestions={vpcOpts}
              placeholder="vpc-... (optional)"
              help={
                selectedProfileId ? (
                  <>
                    Suggested VPCs in <strong>{state.region || "this region"}</strong> (read-only API). Choose a VPC
                    to filter subnets and security groups, or type any ID.
                  </>
                ) : (
                  "Select a credential profile above to load suggestions, or type a VPC id manually."
                )
              }
              aria-label="VPC ID"
            />
            <ComboboxField
              label="Subnet ID"
              value={state.subnet_id}
              onChange={(v) => setState((s) => ({ ...s, subnet_id: v }))}
              suggestions={subnetOpts}
              placeholder="subnet-..."
              help={
                <>
                  Required for EC2. With a <strong>VPC</strong> and profile, we list subnets in that VPC; you can
                  still paste a subnet from another VPC if you need to.
                </>
              }
              aria-label="Subnet ID"
            />
          </>
        )}

        {canShowCompute && (
          <>
            <ComboboxField
              label="Instance type"
              value={state.instance_type}
              onChange={(v) => setState((s) => ({ ...s, instance_type: v }))}
              suggestions={instOpts}
              placeholder="t3.micro"
              help="Pick a common size or type your own (must exist in the region / account limits)."
              aria-label="Instance type"
            />
            <ComboboxField
              label="AMI ID"
              value={state.ami}
              onChange={(v) => setState((s) => ({ ...s, ami: v }))}
              suggestions={amiOpts}
              placeholder="ami-..."
              help="Latest Amazon Linux suggestions load when a profile is selected; you can use any machine image id."
              aria-label="AMI id"
            />
            <ComboboxField
              label="Key name (optional)"
              value={state.key_name}
              onChange={(v) => setState((s) => ({ ...s, key_name: v }))}
              suggestions={keyOpts}
              help="EC2 key pairs in this region, or a custom name."
              aria-label="Key pair name"
            />
            <div className={fieldClass}>
              <label>Security group IDs (comma-separated)</label>
              <p className="help">Suggestions are per-VPC when a profile and VPC are set. Separate multiple IDs with commas.</p>
              <input
                className={inputClass}
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
                list="ib-sg-suggest"
                aria-label="Security group ids"
              />
              <datalist id="ib-sg-suggest">
                {sgOpts.map((o) => (
                  <option key={o.value} value={o.value} />
                ))}
              </datalist>
            </div>
            <div className={fieldClass}>
              <label>
                <input
                  type="checkbox"
                  checked={state.associate_public_ip}
                  onChange={(e) => setState((s) => ({ ...s, associate_public_ip: e.target.checked }))}
                />{" "}
                Associate public IP
              </label>
            </div>
            <div className={fieldClass}>
              <label>
                <input
                  type="checkbox"
                  checked={state.imdsv2_required}
                  onChange={(e) => setState((s) => ({ ...s, imdsv2_required: e.target.checked }))}
                />{" "}
                Require IMDSv2
              </label>
            </div>
            <ComboboxField
              label="SSH CIDR (for guidance)"
              value={state.ssh_cidr}
              onChange={(v) => setState((s) => ({ ...s, ssh_cidr: v }))}
              suggestions={[
                { value: "0.0.0.0/0" },
                { value: "10.0.0.0/8" },
                { value: "172.16.0.0/12" },
                { value: "192.168.0.0/16" },
              ]}
              placeholder="203.0.113.10/32"
              help="Used only for security hints, not in all templates."
              aria-label="SSH CIDR for guidance"
            />
            <div className={fieldClass}>
              <label>
                <input
                  type="checkbox"
                  checked={state.enable_ebs_encryption}
                  onChange={(e) => setState((s) => ({ ...s, enable_ebs_encryption: e.target.checked }))}
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

        {isAiAssistUIEnabled() && <AiAssistPanel state={state} />}
      </main>

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
