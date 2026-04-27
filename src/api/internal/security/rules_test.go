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

func TestEvaluate_NonAWS_NoImdsv2(t *testing.T) {
	s := gen.WizardState{Cloud: "gcp", IMDSv2Required: false, SubnetID: "x", InstanceType: "e2", AMI: "y"}
	for _, r := range Evaluate(s) {
		if r.ID == "imdsv2" {
			t.Fatal("imdsv2 should not apply to gcp")
		}
	}
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

func TestEvaluate_BurstCPUCredits_Burstable(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "subnet-1",
		InstanceType: "T3A.small",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	hasID(t, recs, "burst-cpu-credits")
}

func TestEvaluate_BurstCPUCredits_NotForM5(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "subnet-1",
		InstanceType: "m5.large",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	for _, r := range recs {
		if r.ID == "burst-cpu-credits" {
			t.Fatal("did not expect burst hint for m5")
		}
	}
}

func TestEvaluate_KeyPairHint(t *testing.T) {
	s := gen.WizardState{KeyName: "my-key"}
	recs := Evaluate(s)
	hasID(t, recs, "ec2-keypair-long-lived")
}

func TestEvaluate_SecretsManagerAppRuntime_WhenComputeReady(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "subnet-1",
		InstanceType: "t3.micro",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	hasID(t, recs, "secrets-manager-app-runtime")
	var found *Recommendation
	for i := range recs {
		if recs[i].ID == "secrets-manager-app-runtime" {
			found = &recs[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected secrets-manager recommendation struct")
	}
	if !strings.Contains(found.Remediation, "secretsmanager") {
		t.Fatal("expected Secrets Manager in remediation")
	}
}

func TestEvaluate_SecretsManagerAppRuntime_RequiresCompute(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "",
		InstanceType: "t3.micro",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	for _, r := range recs {
		if r.ID == "secrets-manager-app-runtime" {
			t.Fatal("did not expect secrets-manager hint without subnet/complete compute")
		}
	}
}

func TestEvaluate_PrivateEgressEndpoints_WhenNoPublicIP(t *testing.T) {
	s := gen.WizardState{
		SubnetID:          "subnet-1",
		InstanceType:      "t3.micro",
		AMI:               "ami-123",
		AssociatePublicIP: false,
	}
	recs := Evaluate(s)
	hasID(t, recs, "private-egress-endpoints")
	var found *Recommendation
	for i := range recs {
		if recs[i].ID == "private-egress-endpoints" {
			found = &recs[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected private-egress-endpoints")
	}
	if !strings.Contains(found.Remediation, "Terraform") {
		t.Fatal("expected Terraform in remediation")
	}
}

func TestEvaluate_PrivateEgressEndpoints_AbsentWhenPublicIP(t *testing.T) {
	s := gen.WizardState{
		SubnetID:          "subnet-1",
		InstanceType:      "t3.micro",
		AMI:               "ami-123",
		AssociatePublicIP: true,
	}
	recs := Evaluate(s)
	for _, r := range recs {
		if r.ID == "private-egress-endpoints" {
			t.Fatal("did not expect private-egress hint with public IP")
		}
	}
}

func TestEvaluate_PrivateEgressEndpoints_RequiresCompleteCompute(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "",
		InstanceType: "t3.micro",
		AMI:          "ami-123",
	}
	recs := Evaluate(s)
	for _, r := range recs {
		if r.ID == "private-egress-endpoints" {
			t.Fatal("did not expect private-egress without complete compute")
		}
	}
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

func TestEvaluate_VpcIdMissing(t *testing.T) {
	s := gen.WizardState{
		SubnetID:     "subnet-1",
		InstanceType: "t3.micro",
		AMI:          "ami-1",
	}
	recs := Evaluate(s)
	hasID(t, recs, "vpc-id-missing")
}

func TestEvaluate_EbsCmkWhenEncrypted(t *testing.T) {
	s := gen.WizardState{
		SubnetID:              "subnet-1",
		InstanceType:          "m5.large",
		AMI:                   "ami-1",
		EnableEbsEncryption:   true,
		SecurityGroupIDs:      []string{"sg-1"},
	}
	recs := Evaluate(s)
	hasID(t, recs, "ebs-cmk-consider")
}

func TestEvaluate_SecretRefDataSource_WhenNamesSet(t *testing.T) {
	s := gen.WizardState{
		SubnetID:                   "subnet-1",
		InstanceType:               "t3.micro",
		AMI:                        "ami-1",
		SecurityGroupIDs:           []string{"sg-1"},
		AppSecretsManagerSecretName: "app/secret",
	}
	recs := Evaluate(s)
	hasID(t, recs, "secret-ref-data-source")
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
