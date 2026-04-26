import { useEffect, useState } from "react";
import type { AuthStatus, ProfileSummary } from "./credentialApi";
import { createCredentialProfile, deleteCredentialProfile, listCredentialProfiles } from "./credentialApi";
import { errorMessageFromUnknown } from "./fetchUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  canSave: boolean;
  authStatus: AuthStatus;
  profiles: ProfileSummary[];
  selectedProfileId: string;
  onSelectProfile: (id: string) => void;
  onProfilesRefreshed: (list: ProfileSummary[]) => void;
};

export function ManageProfilesModal({
  open,
  onClose,
  canSave,
  authStatus,
  profiles,
  selectedProfileId,
  onSelectProfile,
  onProfilesRefreshed,
}: Props) {
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [npName, setNpName] = useState("");
  const [npRegion, setNpRegion] = useState("");
  const [npAk, setNpAk] = useState("");
  const [npSk, setNpSk] = useState("");

  useEffect(() => {
    if (!open) {
      setLocalErr(null);
      setNpName("");
      setNpRegion("");
      setNpAk("");
      setNpSk("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const refresh = async () => {
    const list = await listCredentialProfiles();
    onProfilesRefreshed(list);
  };

  const saveNewProfile = () => {
    if (!canSave) {
      return;
    }
    setLocalErr(null);
    if (!npName.trim() || !npRegion.trim() || !npAk.trim() || !npSk.trim()) {
      setLocalErr("Name, default region, access key, and secret are required.");
      return;
    }
    setSaveBusy(true);
    void (async () => {
      try {
        const id = await createCredentialProfile({
          name: npName.trim(),
          default_region: npRegion.trim(),
          access_key_id: npAk,
          secret_access_key: npSk,
        });
        setNpAk("");
        setNpSk("");
        setNpName("");
        setNpRegion("");
        await refresh();
        onSelectProfile(id);
      } catch (e) {
        setLocalErr(errorMessageFromUnknown(e));
      } finally {
        setSaveBusy(false);
      }
    })();
  };

  const removeSelected = () => {
    if (!selectedProfileId) {
      return;
    }
    if (
      !window.confirm(
        "Remove this saved profile? You can add it again with new keys. AWS discovery will use manual IDs until you pick another profile."
      )
    ) {
      return;
    }
    setLocalErr(null);
    setRemoveBusy(true);
    void (async () => {
      try {
        await deleteCredentialProfile(selectedProfileId);
        onSelectProfile("");
        await refresh();
      } catch (e) {
        setLocalErr(errorMessageFromUnknown(e));
      } finally {
        setRemoveBusy(false);
      }
    })();
  };

  if (!open) {
    return null;
  }

  const toolbarClass = "toolbar-btn m43-button";
  const inputClass = "m43-input";
  const errClass = "message--error m43-message--error";

  return (
    <div
      className="profile-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="profile-modal"
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="profile-modal__head">
          <h2 className="profile-modal__title" id="profile-modal-title">
            AWS credential profiles
          </h2>
          <button
            type="button"
            className={`${toolbarClass} profile-modal__icon-btn`}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="help profile-modal__intro">
          Keys are <strong>encrypted on the server</strong> and never shown again. Choose a profile to
          auto-suggest VPCs, subnets, and related IDs, or add a new one with the form below.
        </p>
        {localErr && <p className={errClass}>{localErr}</p>}

        <div className="profile-modal__section">
          <label className="profile-modal__label" htmlFor="profile-modal-active">
            Active profile
          </label>
          <div className="profile-modal__row">
            <select
              id="profile-modal-active"
              className={inputClass}
              value={selectedProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              aria-label="Select saved AWS credential profile"
            >
              <option value="">No profile (manual IDs only)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.default_region || "—"})
                </option>
              ))}
            </select>
            <button
              type="button"
              className={toolbarClass}
              onClick={removeSelected}
              disabled={!canSave || !selectedProfileId || removeBusy}
            >
              {removeBusy ? "Removing…" : "Remove profile"}
            </button>
          </div>
        </div>

        <div className="profile-modal__section">
          <h3 className="profile-modal__h3">Add new profile</h3>
          <p className="help">Same data as the API / CLI: name, default region, and static AWS keys.</p>
          <div className="profile-modal__row profile-modal__row--wrap">
            <input
              className={inputClass}
              value={npName}
              onChange={(e) => setNpName(e.target.value)}
              placeholder="Profile name"
              autoComplete="off"
              aria-label="New profile name"
              disabled={!canSave || saveBusy}
            />
            <input
              className={inputClass}
              value={npRegion}
              onChange={(e) => setNpRegion(e.target.value)}
              placeholder="Default region (e.g. us-east-1)"
              autoComplete="off"
              aria-label="Default region for new profile"
              disabled={!canSave || saveBusy}
            />
          </div>
          <div className="profile-modal__row profile-modal__row--wrap">
            <input
              className={inputClass}
              value={npAk}
              onChange={(e) => setNpAk(e.target.value)}
              placeholder="Access key ID"
              autoComplete="off"
              aria-label="AWS access key id"
              disabled={!canSave || saveBusy}
            />
            <input
              className={inputClass}
              type="password"
              value={npSk}
              onChange={(e) => setNpSk(e.target.value)}
              placeholder="Secret access key"
              autoComplete="off"
              aria-label="AWS secret access key"
              disabled={!canSave || saveBusy}
            />
            <button
              type="button"
              className={toolbarClass}
              onClick={saveNewProfile}
              disabled={!canSave || saveBusy}
            >
              {saveBusy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>

        {authStatus.kind === "signedIn" && (
          <p className="help">
            Signed in as <code>{authStatus.userId}</code> — profiles are scoped to your account.
          </p>
        )}

        <div className="profile-modal__footer">
          <button type="button" className={toolbarClass} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
