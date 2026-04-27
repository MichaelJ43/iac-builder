package security

import (
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

func TestEnforceOperatorPreview_AllowsByDefault(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "")
	if err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: "0.0.0.0/0"}); err != nil {
		t.Fatalf("default: %v", err)
	}
}

func TestEnforceOperatorPreview_BlocksWhenEnvSet(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	err := EnforceOperatorPreview(gen.WizardState{SSHCIDR: "0.0.0.0/0"})
	if err == nil {
		t.Fatal("expected error")
	}
	if err != ErrBlockedSSHOpenWorld {
		t.Fatalf("got %v", err)
	}
}

func TestEnforceOperatorPreview_PassesWhenRestricted(t *testing.T) {
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
