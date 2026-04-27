// Package ops holds deployment/operations config: multi-region catalog, opt-in telemetry, hosted posture.
package ops

import (
	"fmt"
	"os"
	"sort"
	"strings"
)

// defaultRegionCatalog is the set of AWS regions the API is designed to run in; extend when adding
// real multi-region cutovers. IAC_API_ENABLED_REGIONS must use ids from this set.
var defaultRegionCatalog = []string{
	"ap-southeast-1",
	"eu-central-1",
	"eu-west-1",
	"us-east-1",
	"us-west-2",
}

// Runtime is per-process deployment state (from env). Safe to expose in GET /api/v1/operations.
type Runtime struct {
	CurrentRegion     string
	EnabledRegions    []string
	RegionCatalog     []string
	TelemetryServerOn bool
	TLSTerminated     bool
	DataResidency     string
}

// NewFromEnv builds the operations runtime. Defaults: single active region us-east-1, telemetry off.
// Set IAC_API_REGION (or fall back to AWS_REGION) for this deployment. Set IAC_API_ENABLED_REGIONS
// to a comma-separated subset of the catalog; default is us-east-1 only.
func NewFromEnv() (*Runtime, error) {
	return newRuntime(os.Getenv, defaultRegionCatalog)
}

func newRuntime(getenv func(string) string, catalog []string) (*Runtime, error) {
	seen := make(map[string]struct{})
	cat := make([]string, 0, len(catalog))
	for _, r := range catalog {
		r = strings.TrimSpace(strings.ToLower(r))
		if r == "" {
			continue
		}
		if _, ok := seen[r]; ok {
			continue
		}
		seen[r] = struct{}{}
		cat = append(cat, r)
	}
	if len(cat) < 1 {
		return nil, fmt.Errorf("ops: empty region catalog")
	}
	sort.Strings(cat)
	catSet := make(map[string]struct{}, len(cat))
	for _, r := range cat {
		catSet[r] = struct{}{}
	}

	current := strings.TrimSpace(strings.ToLower(getenv("IAC_API_REGION")))
	if current == "" {
		current = strings.TrimSpace(strings.ToLower(getenv("AWS_REGION")))
	}
	if current == "" {
		current = "us-east-1"
	}

	enabledStr := strings.TrimSpace(getenv("IAC_API_ENABLED_REGIONS"))
	var enabled []string
	if enabledStr == "" {
		enabled = []string{"us-east-1"}
	} else {
		for _, p := range strings.Split(enabledStr, ",") {
			p = strings.TrimSpace(strings.ToLower(p))
			if p == "" {
				continue
			}
			if _, ok := catSet[p]; !ok {
				return nil, fmt.Errorf("ops: IAC_API_ENABLED_REGIONS contains unknown region %q (not in catalog)", p)
			}
			enabled = append(enabled, p)
		}
	}
	if len(enabled) < 1 {
		return nil, fmt.Errorf("ops: IAC_API_ENABLED_REGIONS resolved to an empty set")
	}
	sort.Strings(enabled)

	if _, ok := catSet[current]; !ok {
		return nil, fmt.Errorf("ops: IAC_API_REGION / AWS_REGION %q is not in the API region catalog", current)
	}

	tel := envTruthy(getenv("IAC_TELEMETRY_OPT_IN"))
	tls := envTruthy(getenv("IAC_HOSTED_TLS_TERMINATION"))
	data := strings.TrimSpace(getenv("IAC_DATA_RESIDENCY_REGION"))
	if data == "" {
		data = current
	} else {
		data = strings.ToLower(data)
	}

	return &Runtime{
		CurrentRegion:     current,
		EnabledRegions:    enabled,
		RegionCatalog:     cat,
		TelemetryServerOn: tel,
		TLSTerminated:     tls,
		DataResidency:     data,
	}, nil
}

// CurrentInEnabled reports whether this deployment’s region is listed in IAC_API_ENABLED_REGIONS.
func (r *Runtime) CurrentInEnabled() bool {
	if r == nil {
		return false
	}
	for _, e := range r.EnabledRegions {
		if e == r.CurrentRegion {
			return true
		}
	}
	return false
}

// OperationsView is the JSON for GET /api/v1/operations.
type OperationsView struct {
	AppVersion  string    `json:"app_version"`
	Region      Region    `json:"region"`
	Telemetry   Telemetry `json:"telemetry"`
	Posture     Posture   `json:"posture"`
}

// Region describes multi-region readiness (only IAC_API_ENABLED_REGIONS are active; catalog is the roadmap).
type Region struct {
	Current         string   `json:"current"`
	Enabled         []string `json:"enabled"`
	Catalog         []string `json:"catalog"`
	CurrentInEnabled bool    `json:"current_in_enabled"`
}

type Telemetry struct {
	ServerOptIn  bool   `json:"server_opt_in"`
	Instructions string `json:"instructions"`
}

type Posture struct {
	DataResidency  string `json:"data_residency"`
	TLSTerminated  bool   `json:"tls_terminated"`
	HostedReadiness string `json:"hosted_readiness"`
}

// PublicJSON builds the public operations payload.
func (r *Runtime) PublicJSON(appVersion string) OperationsView {
	if r == nil {
		return OperationsView{AppVersion: appVersion}
	}
	inst := "Telemetry is off. The operator can set IAC_TELEMETRY_OPT_IN=1; clients must send X-IAC-Telemetry-Consent: opt-in on POST /api/v1/operations/telemetry."
	if r.TelemetryServerOn {
		inst = "The operator has enabled the telemetry endpoint. Clients must still send X-IAC-Telemetry-Consent: opt-in; only anonymous, non-secret event names are accepted."
	}
	ready := "degraded: deployment region is not in the enabled set"
	if r.CurrentInEnabled() {
		ready = "ok"
	}
	return OperationsView{
		AppVersion: appVersion,
		Region: Region{
			Current:          r.CurrentRegion,
			Enabled:          append([]string(nil), r.EnabledRegions...),
			Catalog:          append([]string(nil), r.RegionCatalog...),
			CurrentInEnabled: r.CurrentInEnabled(),
		},
		Telemetry: Telemetry{
			ServerOptIn:   r.TelemetryServerOn,
			Instructions: inst,
		},
		Posture: Posture{
			DataResidency:  r.DataResidency,
			TLSTerminated:  r.TLSTerminated,
			HostedReadiness: ready,
		},
	}
}

// Test returns a default runtime for tests (us-east-1 only, telemetry off).
func Test() *Runtime {
	return &Runtime{
		CurrentRegion:     "us-east-1",
		EnabledRegions:    []string{"us-east-1"},
		RegionCatalog:     append([]string(nil), defaultRegionCatalog...),
		TelemetryServerOn: false,
		TLSTerminated:     false,
		DataResidency:     "us-east-1",
	}
}

func envTruthy(s string) bool {
	t := strings.ToLower(strings.TrimSpace(s))
	return t == "1" || t == "true" || t == "yes" || t == "on"
}
