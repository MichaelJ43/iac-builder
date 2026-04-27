import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { CloudId, Framework, SecurityRecommendation, WizardState } from "./api";
import {
  emptyWizardState,
  fetchOperationsInfo,
  fetchOperatorGuards,
  type OperationsInfo,
  type OperatorGuardsStatus,
  preview,
  securityRecommendations,
} from "./api";
import { INSTANCE_TYPE_SUGGESTIONS } from "./awsConstants";
import {
  CLOUD_OPTIONS,
  imageFieldPlaceholder,
  instanceTypeFieldHelp,
  instanceTypeFieldPlaceholder,
  isAwsCloud,
  networkFieldLabels,
  regionFieldHelp,
  regionPlaceholderForCloud,
  regionSuggestionsForCloud,
  subnetFieldPlaceholder,
  vpcFieldPlaceholder,
} from "./cloudConstants";
import { ComboboxField } from "./ComboboxField";
import { fetchAuthStatus, listCredentialProfiles, type AuthStatus, type ProfileSummary } from "./credentialApi";
import { errorMessageFromUnknown } from "./fetchUtils";
import { PresetDiffTable } from "./PresetDiffTable";
import {
  createWizardPreset,
  deletePreset,
  getPresetWizard,
  listPresets,
  parsePresetLabelsInput,
  type PresetSummary,
} from "./presetApi";
import { useCloudDiscovery } from "./useCloudDiscovery";
import { useWizardUndoState } from "./useWizardUndoState";
import {
  buildWizardExport,
  parseWizardImport,
  readFileAsText,
  stringifyExport,
} from "./wizardExportImport";
import {
  distinctStarterTags,
  filterStartersByTag,
  getStarterTemplate,
  STARTER_CATALOG_TAG_ALL,
  STARTER_TEMPLATES,
} from "./starterCatalog";
import { AiAssistPanel } from "./AiAssistPanel";
import { isAiAssistUIEnabled } from "./flags";
import { ManageProfilesModal } from "./ManageProfilesModal";
import { validateWizardForPreview } from "./wizardValidation";

const frameworks: { id: Framework; label: string }[] = [
  { id: "terraform", label: "Terraform (HCL)" },
  { id: "opentofu", label: "OpenTofu (HCL)" },
  { id: "cloudformation", label: "AWS CloudFormation" },
  { id: "pulumi", label: "Pulumi" },
  { id: "azure_bicep", label: "Azure Bicep" },
  { id: "aws_cdk", label: "AWS CDK" },
  { id: "crossplane", label: "Crossplane" },
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
  const [operatorGuards, setOperatorGuards] = useState<OperatorGuardsStatus | null>(null);
  const [operationsInfo, setOperationsInfo] = useState<OperationsInfo | null>(null);

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
  const [newPresetLabels, setNewPresetLabels] = useState("");
  const [selectedStarterTag, setSelectedStarterTag] = useState<string>(STARTER_CATALOG_TAG_ALL);
  const [presetListLabelFilter, setPresetListLabelFilter] = useState("");
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
        setOperatorGuards(await fetchOperatorGuards());
      } catch {
        setOperatorGuards(null);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setOperationsInfo(await fetchOperationsInfo());
      } catch {
        setOperationsInfo(null);
      }
    })();
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

  const discovery = useCloudDiscovery(
    (state.cloud || "aws") as CloudId,
    selectedProfileId,
    state.region,
    state.vpc_id
  );

  const networkLabels = useMemo(() => networkFieldLabels(state.cloud || "aws"), [state.cloud]);

  const regionOpts = useMemo(
    () => regionSuggestionsForCloud(state.cloud || "aws").map((v) => ({ value: v })),
    [state.cloud]
  );
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

  const discoveryListLoading = useMemo(
    () =>
      selectedProfileId.trim() !== "" && state.region.trim() !== "" && discovery.loading,
    [selectedProfileId, state.region, discovery.loading]
  );
  const discoverySubnetSgLoading = useMemo(
    () =>
      selectedProfileId.trim() !== "" &&
      state.region.trim() !== "" &&
      state.vpc_id.trim() !== "" &&
      discovery.loadingSubnets,
    [selectedProfileId, state.region, state.vpc_id, discovery.loadingSubnets]
  );

  const canShowCloud = state.framework !== "";
  const canShowRegion = canShowCloud;
  const canShowNetwork = state.region.trim() !== "";
  const canShowCompute = state.subnet_id.trim() !== "";
  const canSaveProfile =
    authStatus !== null && (authStatus.kind === "disabled" || authStatus.kind === "signedIn");

  const { ok: canPreview, fields: fieldErr } = useMemo(
    () => validateWizardForPreview(state),
    [state]
  );
  const frameworkErrId = useId();
  const cloudErrId = useId();
  const sgErrId = useId();

  const refresh = useCallback(async () => {
    if (!canPreview) {
      setPreviewText("");
      setHints([]);
      setErr(null);
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
  }, [state, canPreview]);

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

  const filteredStarters = useMemo(
    () => filterStartersByTag(STARTER_TEMPLATES, selectedStarterTag),
    [selectedStarterTag]
  );

  useEffect(() => {
    if (!selectedStarterId) {
      return;
    }
    if (!filteredStarters.some((t) => t.id === selectedStarterId)) {
      setSelectedStarterId("");
    }
  }, [filteredStarters, selectedStarterId]);

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

  const starterTagChoices = useMemo(() => distinctStarterTags(STARTER_TEMPLATES), []);

  const presetLabelOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of presets) {
      for (const l of p.labels ?? []) {
        s.add(l);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [presets]);

  const visiblePresets = useMemo(() => {
    if (!presetListLabelFilter) {
      return presets;
    }
    return presets.filter((p) => p.labels?.includes(presetListLabelFilter));
  }, [presets, presetListLabelFilter]);

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
        const id = await createWizardPreset(name, state, {
          labels: parsePresetLabelsInput(newPresetLabels),
        });
        setNewPresetName("");
        setNewPresetLabels("");
        await refreshPresets();
        setSelectedPresetId(id);
      } catch (e) {
        setPresetActionErr(errorMessageFromUnknown(e));
      } finally {
        setPresetSaveBusy(false);
      }
    })();
  }, [newPresetName, newPresetLabels, state, refreshPresets]);

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
          const id = await createWizardPreset(name, w, {
            labels: parsePresetLabelsInput(newPresetLabels),
          });
          setNewPresetName("");
          setNewPresetLabels("");
          await refreshPresets();
          setSelectedPresetId(id);
        } catch (err) {
          setPresetActionErr(errorMessageFromUnknown(err));
        } finally {
          setPresetSaveBusy(false);
        }
      })();
    },
    [newPresetName, newPresetLabels, refreshPresets]
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
          <p className="m43-intro">
            Walk through <strong>framework</strong>, <strong>cloud</strong>, and <strong>region</strong>, then an
            optional <strong>AWS profile</strong> for discovery, then <strong>network and compute</strong>. The code
            preview updates as you go. A <strong>subnet</strong> (or your target’s equivalent) is always required; on
            AWS, <strong>VPC</strong> is optional and unlocks list hints when a profile is set. The same form covers
            AWS and other cloud starters (GCP, OCI) plus Kubernetes, Ansible, and VMware. Optional shortcuts: bundled
            starters and server presets.
          </p>
          {operationsInfo && (
            <details className="wizard-header-details">
              <summary>About this API deployment</summary>
              <p className="help" role="status">
                This instance: <code>{operationsInfo.region.current}</code>. Active API regions:{" "}
                {operationsInfo.region.enabled.join(", ")}. Full deployment posture, catalog, and telemetry options
                are in the <code>operations</code> JSON (for operators and tools): <code>/api/v1/operations</code>
              </p>
            </details>
          )}
        </header>
        {operatorGuards?.any_enabled && (
          <details className="wizard-header-details m43-operator-guards">
            <summary>Operator security guardrails are on</summary>
            <p className="help" role="status">
              The server may reject some preview requests based on <code>IAC_*</code> environment. See{" "}
              <code>docs/security.md</code> and the <code>operator/guards</code> JSON (same shape as the UI fetch).
            </p>
          </details>
        )}
        <div className="wizard-toolbar" id="wizard-toolbar">
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
            id="wizard-import-json"
            aria-describedby="toolbar-json-hint"
            aria-label="Import JSON from your device (replaces the wizard)"
          >
            Import JSON
          </button>
        </div>
        <p className="help wizard-toolbar__hint" id="toolbar-json-hint">
          <strong>Import JSON</strong> replaces the current wizard. <strong>Create from JSON file</strong> in{" "}
          <a href="#server-presets">Server presets (API)</a> uploads to the API only and does not change the form.
        </p>
        {importErr && <p className={errorClass}>{importErr}</p>}

        <div className={`${fieldClass} starter-catalog`}>
          <label>Quick-builder stack catalog (bundled)</label>
          <p className="help">
            Load a <strong>curated</strong> example end-to-end. Values use obvious placeholder AWS IDs; replace
            with real subnet, security group, and AMI in your account before you trust generated IaC in AWS. Filter
            by tag to narrow the list.
          </p>
          <div className="preset-compare__row">
            <label htmlFor="starter-tag-filter" className="visually-hidden">
              Filter by tag
            </label>
            <select
              id="starter-tag-filter"
              className={inputClass}
              value={selectedStarterTag}
              onChange={(e) => setSelectedStarterTag(e.target.value)}
              aria-label="Filter starter templates by tag"
            >
              <option value={STARTER_CATALOG_TAG_ALL}>All tags</option>
              {starterTagChoices.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div className="preset-compare__row">
            <select
              className={inputClass}
              value={selectedStarterId}
              onChange={(e) => setSelectedStarterId(e.target.value)}
              aria-label="Bundled starter template"
            >
              <option value="">Choose a starter…</option>
              {filteredStarters.map((t) => (
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
        {err && <p className={errorClass}>{err}</p>}

        <div className={fieldClass}>
          <label htmlFor="wizard-framework">IaC framework</label>
          <select
            id="wizard-framework"
            className={inputClass}
            aria-label="IaC framework"
            aria-invalid={fieldErr.framework ? true : undefined}
            aria-describedby={fieldErr.framework ? frameworkErrId : undefined}
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
          {fieldErr.framework && (
            <p id={frameworkErrId} className={errorClass} role="alert">
              {fieldErr.framework}
            </p>
          )}
        </div>

        {canShowCloud && (
          <div className={fieldClass}>
            <label htmlFor="wizard-cloud">Cloud</label>
            <select
              id="wizard-cloud"
              className={inputClass}
              aria-invalid={fieldErr.cloud ? true : undefined}
              aria-describedby={fieldErr.cloud ? cloudErrId : undefined}
              value={state.cloud}
              onChange={(e) =>
                setState((s) => ({ ...s, cloud: e.target.value as CloudId, region: "" }))
              }
            >
              {CLOUD_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            </select>
            {fieldErr.cloud && (
              <p id={cloudErrId} className={errorClass} role="alert">
                {fieldErr.cloud}
              </p>
            )}
          </div>
        )}

        {canShowRegion && (
          <ComboboxField
            label="Region"
            value={state.region}
            onChange={(v) => setState((s) => ({ ...s, region: v }))}
            suggestions={regionOpts}
            placeholder={regionPlaceholderForCloud(state.cloud || "aws")}
            help={<>{regionFieldHelp(state.cloud || "aws")}</>}
            error={fieldErr.region}
            aria-label="Cloud region"
          />
        )}


        {authStatus?.kind === "signedOut" && (
          <p className="help">
            <strong>AWS read-only discovery</strong> and saving profiles require a session. Use{" "}
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
            {discovery.discoveryNote && <p className="help">{discovery.discoveryNote}</p>}
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
        {canShowNetwork && (
          <>
            {isAwsCloud(state.cloud) && selectedProfileId && (discovery.loading || discovery.loadingSubnets) && (
              <p className="help" aria-live="polite">
                Loading AWS read-only suggestions for this profile and region…
              </p>
            )}
            <ComboboxField
              label={networkLabels.vpc}
              value={state.vpc_id}
              onChange={(v) => setState((s) => ({ ...s, vpc_id: v }))}
              suggestions={vpcOpts}
              placeholder={vpcFieldPlaceholder(state.cloud || "aws")}
              busy={discoveryListLoading}
              help={
                isAwsCloud(state.cloud) && selectedProfileId ? (
                  <>
                    Suggested networks in <strong>{state.region || "this region"}</strong> (read-only). Choose a VPC
                    to filter subnets and security groups, or type any id.
                  </>
                ) : isAwsCloud(state.cloud) ? (
                  "Select a credential profile to load suggestions, or type a VPC id manually."
                ) : (
                  "No live list for this cloud; paste a full resource name or id from your project."
                )
              }
              aria-label={networkLabels.vpc}
            />
            <ComboboxField
              label={networkLabels.subnet}
              value={state.subnet_id}
              onChange={(v) => setState((s) => ({ ...s, subnet_id: v }))}
              suggestions={subnetOpts}
              placeholder={subnetFieldPlaceholder(state.cloud || "aws")}
              busy={discoverySubnetSgLoading}
              help={
                isAwsCloud(state.cloud) ? (
                  <>
                    Required for the VM. With a <strong>parent network</strong> and profile, we list AWS subnets; you
                    can still paste any subnet id.
                  </>
                ) : (
                  "Required. Enter the subnetwork or subnet resource id for your project."
                )
              }
              error={fieldErr.subnet_id}
              aria-label={networkLabels.subnet}
            />
          </>
        )}

        {canShowCompute && (
          <>
            <ComboboxField
              label={networkLabels.instance}
              value={state.instance_type}
              onChange={(v) => setState((s) => ({ ...s, instance_type: v }))}
              suggestions={instOpts}
              placeholder={instanceTypeFieldPlaceholder(state.cloud || "aws")}
              help={instanceTypeFieldHelp(state.cloud || "aws")}
              error={fieldErr.instance_type}
              aria-label="Instance type"
            />
            <ComboboxField
              label={networkLabels.image}
              value={state.ami}
              onChange={(v) => setState((s) => ({ ...s, ami: v }))}
              suggestions={amiOpts}
              placeholder={imageFieldPlaceholder(state.cloud || "aws")}
              busy={discoveryListLoading}
              help={
                isAwsCloud(state.cloud)
                  ? "Latest Amazon Linux suggestions load with a profile; or use any machine image id."
                  : "Set a container image, template name, or cloud image/OCID path; see your target’s documentation."
              }
              error={fieldErr.ami}
              aria-label={networkLabels.image}
            />
            {isAwsCloud(state.cloud) && (
            <ComboboxField
              label="Key name (optional)"
              value={state.key_name}
              onChange={(v) => setState((s) => ({ ...s, key_name: v }))}
              suggestions={keyOpts}
              busy={discoveryListLoading}
              help="EC2 key pairs in this region, or a custom name."
              aria-label="Key pair name"
            />
            )}
            <div className={fieldClass}>
              <label htmlFor="wizard-sg-ids">
                {isAwsCloud(state.cloud) ? "Security group IDs (comma-separated)" : "Network security ids (optional)"}
              </label>
              <p className="help">
                {isAwsCloud(state.cloud)
                  ? "Suggestions are per-VPC when a profile and VPC are set. Separate multiple AWS sg- ids with commas."
                  : "On non-AWS targets, paste firewall, NSG, or NetworkPolicy references if applicable; the Terraform starters may only wire AWS when targeting EC2."}
              </p>
              <input
                id="wizard-sg-ids"
                className={discoverySubnetSgLoading ? `${inputClass} m43-input--busy` : inputClass}
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
                aria-busy={discoverySubnetSgLoading}
                aria-invalid={fieldErr.security_group_ids ? true : undefined}
                aria-describedby={fieldErr.security_group_ids ? sgErrId : undefined}
                aria-label="Security group ids"
              />
              {fieldErr.security_group_ids && (
                <p id={sgErrId} className={errorClass} role="alert">
                  {fieldErr.security_group_ids}
                </p>
              )}
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
            {isAwsCloud(state.cloud) && (
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
            )}
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
              error={fieldErr.ssh_cidr}
              aria-label="SSH CIDR for guidance"
            />
            <div className={fieldClass}>
              <label>
                <input
                  type="checkbox"
                  checked={state.enable_ebs_encryption}
                  onChange={(e) => setState((s) => ({ ...s, enable_ebs_encryption: e.target.checked }))}
                />{" "}
                {isAwsCloud(state.cloud) ? "Encrypt root EBS" : "Encrypt root / boot volume (hint for templates)"}
              </label>
            </div>
            {isAwsCloud(state.cloud) && (
            <details className={fieldClass}>
              <summary>Application secret references (optional, Terraform / guidance)</summary>
              <p className="help">
                For <strong>existing</strong> AWS Secrets Manager secrets or SSM parameters (by name, not the secret
                value). Terraform includes <code>data</code> sources; you still attach an instance profile and IAM. CloudFormation includes comments only; wire IAM yourself.
              </p>
              <div className={fieldClass}>
                <label htmlFor="wizard-sm-secret">Secrets Manager secret name</label>
                <input
                  id="wizard-sm-secret"
                  className={inputClass}
                  value={state.app_secretsmanager_secret_name}
                  onChange={(e) => setState((s) => ({ ...s, app_secretsmanager_secret_name: e.target.value }))}
                  autoComplete="off"
                  placeholder="e.g. prod/app/database"
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor="wizard-ssm-param">SSM parameter name (path)</label>
                <input
                  id="wizard-ssm-param"
                  className={inputClass}
                  value={state.app_ssm_parameter_name}
                  onChange={(e) => setState((s) => ({ ...s, app_ssm_parameter_name: e.target.value }))}
                  autoComplete="off"
                  placeholder="e.g. /myapp/credentials/arn"
                />
              </div>
            </details>
            )}
          </>
        )}


        <details className={`${fieldClass} preset-compare preset-compare--details`}>
          <summary className="preset-compare__summary">Server presets (API)</summary>
          <p className="help">
            Presets are stored on the server. <strong>Load into wizard</strong> replaces your answers (Undo
            reverts). <strong>Set baseline</strong> diffs without changing the form. <strong>Download as JSON</strong>{" "}
            uses the same file shape as <strong>Export configuration</strong> for sharing.{" "}
            <strong>Create from JSON file</strong> uploads a v1 file to the API. <strong>Delete</strong> removes a
            preset from the API. Presets v1+ support <strong>labels</strong> (team/org “library” tags); the API can
            also merge defaults from <code>IAC_DEFAULT_PRESET_LABELS</code>.
          </p>
          {presetListErr && <p className="preset-compare__err m43-message--error">{presetListErr}</p>}
          {presetActionErr && <p className="preset-compare__err m43-message--error">{presetActionErr}</p>}
          {presetLabelOptions.length > 0 && (
            <div className="preset-compare__row">
              <label htmlFor="preset-list-label-filter" className="m43-preset-label-filter">
                Show presets with label
              </label>
              <select
                id="preset-list-label-filter"
                className={inputClass}
                value={presetListLabelFilter}
                onChange={(e) => {
                  setPresetListLabelFilter(e.target.value);
                  setSelectedPresetId("");
                }}
                aria-label="Filter saved presets by label"
              >
                <option value="">All (no label filter)</option>
                {presetLabelOptions.map((lb) => (
                  <option key={lb} value={lb}>
                    {lb}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                    : visiblePresets.length === 0
                      ? "No presets with this label"
                      : "Select a preset…"}
              </option>
              {visiblePresets.map((p) => {
                const tag =
                  p.labels && p.labels.length > 0 ? ` [${[...p.labels].sort().join(", ")}]` : "";
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {tag}
                    {p.format_version && p.format_version > 0 ? ` (v${p.format_version})` : ""}
                  </option>
                );
              })}
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
            <code>.json</code>) is used. Optional <strong>labels</strong> (comma-separated) are stored with the preset for
            filtering; the server can also add defaults from the environment.
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
              className={inputClass}
              value={newPresetLabels}
              onChange={(e) => {
                setNewPresetLabels(e.target.value);
                setPresetActionErr(null);
              }}
              placeholder="Labels (optional), e.g. team-core, prod"
              autoComplete="off"
              title="Lowercase tag strings for org/team libraries; comma- or semicolon-separated."
              aria-label="Optional comma-separated labels for the new server preset"
              disabled={presetSaveBusy}
            />
          </div>
          <div className="preset-compare__row">
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
        </details>
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

        {isAiAssistUIEnabled() && <AiAssistPanel state={state} authStatus={authStatus} />}
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
        <pre>
          {previewText ||
            (!canPreview
              ? "// fix validation issues in the form to preview"
              : "// loading preview…")}
        </pre>
      </aside>
    </div>
  );
}
