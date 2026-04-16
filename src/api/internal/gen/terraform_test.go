package gen

import (
	"context"
	"strings"
	"testing"
)

func TestTerraformEmitter_Preview(t *testing.T) {
	e := TerraformEmitter{}
	s := WizardState{
		Framework:          FrameworkTerraform,
		Cloud:              "aws",
		Region:             "us-east-1",
		VPCID:              "vpc-123",
		SubnetID:           "subnet-abc",
		InstanceType:       "t3.micro",
		AMI:                "ami-12345",
		KeyName:            "mykey",
		SecurityGroupIDs:   []string{"sg-1", "sg-2"},
		AssociatePublicIP:  true,
		IMDSv2Required:     true,
		EnableEbsEncryption: true,
	}
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	tf := files["main.tf"]
	if !strings.Contains(tf, `resource "aws_instance" "this"`) {
		t.Fatalf("unexpected content: %s", tf)
	}
	if !strings.Contains(tf, "http_tokens = \"required\"") {
		t.Fatal("expected IMDSv2 block")
	}
}
