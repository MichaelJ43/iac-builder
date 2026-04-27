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
	if !strings.Contains(tf, `volume_type = "gp3"`) {
		t.Fatal("expected gp3 root volume")
	}
}

func TestTerraformEmitter_SecretDataSources(t *testing.T) {
	e := TerraformEmitter{}
	s := WizardState{
		Framework:                  FrameworkTerraform,
		Cloud:                        "aws",
		Region:                       "us-east-1",
		SubnetID:                     "subnet-abc",
		InstanceType:                 "t3.micro",
		AMI:                          "ami-12345",
		AppSecretsManagerSecretName:  "my/app/secret",
		AppSSMParameterName:          "/params/app",
		EnableEbsEncryption:          true,
		IMDSv2Required:               true,
		SecurityGroupIDs:             []string{"sg-1"},
	}
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	tf := files["main.tf"]
	if !strings.Contains(tf, `data "aws_secretsmanager_secret" "app_sm"`) || !strings.Contains(tf, "my/app/secret") {
		t.Fatalf("expected secrets manager data source: %s", tf)
	}
	if !strings.Contains(tf, `data "aws_ssm_parameter" "app_ssm"`) || !strings.Contains(tf, "/params/app") {
		t.Fatalf("expected ssm data source: %s", tf)
	}
}

func TestTerraformEmitter_MultiRegion(t *testing.T) {
	e := TerraformEmitter{}
	s := WizardState{
		Framework:        FrameworkTerraform,
		Cloud:            "aws",
		Regions:          []string{"us-west-2", "us-east-1"},
		Region:           "us-west-2",
		SubnetID:         "subnet-abc",
		InstanceType:     "t3.micro",
		AMI:              "ami-12345",
		SecurityGroupIDs: []string{"sg-1"},
	}
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	tf := files["main.tf"]
	if !strings.Contains(tf, `target_regions = ["us-west-2", "us-east-1"]`) {
		t.Fatalf("unexpected locals: %s", tf)
	}
	if !strings.Contains(tf, `resource "aws_instance" "this_us_west_2"`) || !strings.Contains(tf, `resource "aws_instance" "this_us_east_1"`) {
		t.Fatalf("expected two regional aws_instance resources: %s", tf)
	}
	if !strings.Contains(tf, "provider = aws.us_east_1") {
		t.Fatalf("expected aliased provider on second instance: %s", tf)
	}
}
