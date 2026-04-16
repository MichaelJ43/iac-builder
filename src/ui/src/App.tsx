import { useCallback, useEffect, useMemo, useState } from "react";
import type { Framework, WizardState } from "./api";
import { preview, securityRecommendations } from "./api";

const frameworks: { id: Framework; label: string }[] = [
  { id: "terraform", label: "Terraform (HCL)" },
  { id: "cloudformation", label: "AWS CloudFormation" },
  { id: "pulumi", label: "Pulumi" },
  { id: "azure_bicep", label: "Azure Bicep" },
  { id: "aws_cdk", label: "AWS CDK" },
];

const emptyState = (): WizardState => ({
  framework: "",
  cloud: "aws",
  region: "",
  vpc_id: "",
  subnet_id: "",
  instance_type: "",
  ami: "",
  key_name: "",
  security_group_ids: [],
  associate_public_ip: false,
  imdsv2_required: false,
  ssh_cidr: "",
  enable_ebs_encryption: false,
});

export function App() {
  const [state, setState] = useState<WizardState>(emptyState);
  const [sliderOpen, setSliderOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const canShowCloud = state.framework !== "";
  const canShowRegion = canShowCloud;
  const canShowNetwork = state.region.trim() !== "";
  const canShowCompute =
    state.subnet_id.trim() !== "" && state.vpc_id.trim() !== "";

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
      setHints(recs.map((r) => `[${r.severity}] ${r.message}`));
    } catch (e) {
      setErr(String(e));
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

  return (
    <div className="layout">
      <div className="main">
        <h1>iac-builder</h1>
        <p>Guided IaC for AWS EC2 (MVP). Pick a framework first.</p>
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div className="step">
          <label>IaC framework</label>
          <select
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
              <label>VPC ID (context)</label>
              <input
                value={state.vpc_id}
                onChange={(e) => setState((s) => ({ ...s, vpc_id: e.target.value }))}
                placeholder="vpc-..."
              />
            </div>
            <div className="step">
              <label>Subnet ID</label>
              <input
                value={state.subnet_id}
                onChange={(e) => setState((s) => ({ ...s, subnet_id: e.target.value }))}
                placeholder="subnet-..."
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
            <ul>
              {hints.map((h) => (
                <li key={h}>{h}</li>
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
