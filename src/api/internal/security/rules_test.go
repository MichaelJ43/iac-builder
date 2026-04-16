package security

import (
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

func TestEvaluate_IMDSv2(t *testing.T) {
	s := gen.WizardState{IMDSv2Required: false}
	recs := Evaluate(s)
	found := false
	for _, r := range recs {
		if r.ID == "imdsv2" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected imdsv2 recommendation")
	}
}

func TestEvaluate_SSHOpenWorld(t *testing.T) {
	s := gen.WizardState{SSHCIDR: "0.0.0.0/0"}
	recs := Evaluate(s)
	found := false
	for _, r := range recs {
		if r.ID == "ssh-open-world" {
			found = true
			if r.Severity != "warning" {
				t.Fatalf("severity: %s", r.Severity)
			}
			break
		}
	}
	if !found {
		t.Fatal("expected ssh-open-world")
	}
}
