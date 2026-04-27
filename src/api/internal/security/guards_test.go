package security

import (
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

func TestEnforceOperatorPreview_AllowsByDefault(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "")
	t.Setenv("IAC_REQUIRE_IMDSV2", "")
	t.Setenv("IAC_REQUIRE_EBS_ENCRYPTION", "")
	t.Setenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP", "")
	if err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: "0.0.0.0/0"}); err != nil {
		t.Fatalf("default: %v", err)
	}
}

func TestEnforceOperatorPreview_BlocksSSHWhenEnvSet(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	t.Setenv("IAC_REQUIRE_IMDSV2", "")
	err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: "0.0.0.0/0"})
	if err == nil {
		t.Fatal("expected error")
	}
	if err != ErrBlockedSSHOpenWorld {
		t.Fatalf("got %v", err)
	}
}

func TestEnforceOperatorPreview_PassesWhenSSHRistricted(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "true")
	if err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: "198.51.100.0/32"}); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestEnforceOperatorPreview_WhitespaceIPv6(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	if err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: " ::/0 "}); err == nil {
		t.Fatal("expected block for ::/0")
	}
}

func TestEnforceOperatorPreview_RequireIMDSV2(t *testing.T) {
	t.Setenv("IAC_REQUIRE_IMDSV2", "1")
	if err := EnforceOperatorPreview(gen.WizardState{IMDSv2Required: false}); err != ErrRequireImdsv2 {
		t.Fatalf("got %v", err)
	}
	if err := EnforceOperatorPreview(gen.WizardState{IMDSv2Required: true}); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
	// IMDS is AWS-only; do not require the checkbox for other clouds.
	if err := EnforceOperatorPreview(gen.WizardState{Cloud: "gcp", IMDSv2Required: false}); err != nil {
		t.Fatalf("gcp: expected no IMDS error, got %v", err)
	}
}

func TestEnforceOperatorPreview_RequireEbsEncryption(t *testing.T) {
	t.Setenv("IAC_REQUIRE_EBS_ENCRYPTION", "yes")
	if err := EnforceOperatorPreview(gen.WizardState{EnableEbsEncryption: false}); err != ErrRequireEbsEncryption {
		t.Fatalf("got %v", err)
	}
	if err := EnforceOperatorPreview(gen.WizardState{EnableEbsEncryption: true}); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestEnforceOperatorPreview_BlockAssociatePublicIP(t *testing.T) {
	t.Setenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP", "on")
	if err := EnforceOperatorPreview(gen.WizardState{AssociatePublicIP: true}); err != ErrBlockAssociatePublicIP {
		t.Fatalf("got %v", err)
	}
	if err := EnforceOperatorPreview(gen.WizardState{AssociatePublicIP: false}); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestOperatorGuardsStatusFromEnv(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	t.Setenv("IAC_REQUIRE_IMDSV2", "1")
	t.Setenv("IAC_REQUIRE_EBS_ENCRYPTION", "")
	t.Setenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP", "")
	st := OperatorGuardsStatusFromEnv()
	if !st.BlockSshOpenWorld || !st.RequireImdsv2 {
		t.Fatalf("%+v", st)
	}
	if !st.AnyEnabled {
		t.Fatal("any_enabled")
	}
}
