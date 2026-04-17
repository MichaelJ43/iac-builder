package security

import (
	"strings"
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

func ids(recs []Recommendation) []string {
	var s []string
	for _, r := range recs {
		s = append(s, r.ID)
	}
	return s
}

func hasID(t *testing.T, recs []Recommendation, id string) {
	t.Helper()
	for _, r := range recs {
		if r.ID == id {
			return
		}
	}
	t.Fatalf("missing recommendation id %q in %v", id, ids(recs))
}

func TestEvaluate_IMDSv2(t *testing.T) {
	s := gen.WizardState{IMDSv2Required: false}
	recs := Evaluate(s)
	hasID(t, recs, "imdsv2")
}

func TestEvaluate_SSHOpenWorld(t *testing.T) {
	s := gen.WizardState{SSHCIDR: "0.0.0.0/0"}
	recs := Evaluate(s)
	var found *Recommendation
	for i := range recs {
		if recs[i].ID == "ssh-open-world" {
			found = &recs[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected ssh-open-world")
	}
	if found.Severity != "warning" {
		t.Fatalf("severity: %s", found.Severity)
	}
	if found.Remediation == "" {
		t.Fatal("expected remediation")
	}
}

func TestEvaluate_SSHBroadNotOpenWorld(t *testing.T) {
	s := gen.WizardState{SSHCIDR: "10.0.0.0/16"}
	recs := Evaluate(s)
	hasID(t, recs, "ssh-broad-cidr")
	for _, r := range recs {
		if r.ID == "ssh-open-world" {
			t.Fatal("did not expect ssh-open-world for /16")
		}
	}
}

func TestEvaluate_SSHNarrowNoBroad(t *testing.T) {
	s := gen.WizardState{SSHCIDR: "203.0.113.10/32"}
	recs := Evaluate(s)
	for _, r := range recs {
		if r.ID == "ssh-broad-cidr" || r.ID == "ssh-open-world" {
			t.Fatalf("unexpected %s", r.ID)
		}
	}
}

func TestEvaluate_PublicIPUnsetSSH(t *testing.T) {
	s := gen.WizardState{AssociatePublicIP: true, SSHCIDR: "  "}
	recs := Evaluate(s)
	hasID(t, recs, "ssh-cidr-unset-public")
}

func TestEvaluate_MissingSecurityGroups(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "subnet-1",
		InstanceType: "t3.micro",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	hasID(t, recs, "missing-security-groups")
}

func TestEvaluate_KeyPairHint(t *testing.T) {
	s := gen.WizardState{KeyName: "my-key"}
	recs := Evaluate(s)
	hasID(t, recs, "ec2-keypair-long-lived")
}

func TestEvaluate_LeastPrivilegeIAMHasJSONRemediation(t *testing.T) {
	recs := Evaluate(gen.WizardState{})
	var found *Recommendation
	for i := range recs {
		if recs[i].ID == "least-privilege-iam" {
			found = &recs[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected least-privilege-iam")
	}
	if !strings.Contains(found.Remediation, "AmazonSSMManagedInstanceCore") {
		t.Fatal("expected SSM managed policy mention in remediation")
	}
	if !strings.Contains(found.Remediation, `"Version"`) {
		t.Fatal("expected JSON policy fragment in remediation")
	}
}

func Test_sshCIDROpenWorld(t *testing.T) {
	if !sshCIDROpenWorld("0.0.0.0/0 ") {
		t.Fatal("trim")
	}
	if sshCIDROpenWorld("10.0.0.0/8") {
		t.Fatal("not open world")
	}
}

func Test_sshCIDRBroad(t *testing.T) {
	if !sshCIDRBroad("10.0.0.0/16") {
		t.Fatal("expected broad")
	}
	if sshCIDRBroad("203.0.113.0/24") {
		t.Fatal("/24 not broad")
	}
	if sshCIDRBroad("0.0.0.0/0") {
		t.Fatal("open world handled separately")
	}
	if sshCIDRBroad("not-a-cidr") {
		t.Fatal("invalid")
	}
}
