package ops

import (
	"strings"
	"testing"
)

func TestNewFromEnv_default(t *testing.T) {
	t.Setenv("IAC_API_REGION", "")
	t.Setenv("AWS_REGION", "")
	t.Setenv("IAC_API_ENABLED_REGIONS", "")
	r, err := NewFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if r.CurrentRegion != "us-east-1" {
		t.Fatalf("current: %q", r.CurrentRegion)
	}
	if len(r.EnabledRegions) != 1 || r.EnabledRegions[0] != "us-east-1" {
		t.Fatalf("enabled: %#v", r.EnabledRegions)
	}
	if !r.CurrentInEnabled() {
		t.Fatal("current should be in enabled")
	}
	v := r.PublicJSON("1.0.0")
	if v.AppVersion != "1.0.0" {
		t.Fatal(v.AppVersion)
	}
	if v.Posture.HostedReadiness != "ok" {
		t.Fatal(v.Posture.HostedReadiness)
	}
	if v.Telemetry.ServerOptIn {
		t.Fatal("telemetry off by default")
	}
}

func TestNewFromEnv_enabled_subset(t *testing.T) {
	t.Setenv("IAC_API_REGION", "us-east-1")
	t.Setenv("IAC_API_ENABLED_REGIONS", "us-east-1")
	t.Setenv("IAC_TELEMETRY_OPT_IN", "1")
	r, err := NewFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if !r.TelemetryServerOn {
		t.Fatal("expected telemetry on")
	}
}

func TestNewFromEnv_rejects_bad_enabled(t *testing.T) {
	t.Setenv("IAC_API_REGION", "us-east-1")
	t.Setenv("IAC_API_ENABLED_REGIONS", "us-nope-1")
	_, err := NewFromEnv()
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "unknown") {
		t.Fatalf("got %v", err)
	}
}

func TestNewFromEnv_uses_aws_region(t *testing.T) {
	t.Setenv("IAC_API_REGION", "")
	t.Setenv("AWS_REGION", "us-west-2")
	t.Setenv("IAC_API_ENABLED_REGIONS", "us-west-2,us-east-1")
	r, err := NewFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if r.CurrentRegion != "us-west-2" {
		t.Fatalf("got %q", r.CurrentRegion)
	}
}

func TestNewFromEnv_mismatch_gives_degraded(t *testing.T) {
	// current not in enabled
	t.Setenv("IAC_API_REGION", "us-west-2")
	t.Setenv("AWS_REGION", "")
	t.Setenv("IAC_API_ENABLED_REGIONS", "us-east-1")
	r, err := NewFromEnv()
	if err != nil {
		// IAC_API_REGION is in catalog but not in enabled -> still load; degraded posture
		t.Fatal(err)
	}
	if r.CurrentInEnabled() {
		t.Fatal("expected not in enabled")
	}
	if r.PublicJSON("x").Posture.HostedReadiness == "ok" {
		t.Fatal("expected degraded")
	}
}
