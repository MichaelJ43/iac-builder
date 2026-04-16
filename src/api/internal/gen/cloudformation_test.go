package gen

import (
	"context"
	"strings"
	"testing"
)

func TestCloudFormationEmitter_Preview(t *testing.T) {
	e := CloudFormationEmitter{}
	s := WizardState{
		Framework:           FrameworkCloudFormation,
		Cloud:               "aws",
		Region:              "us-east-1",
		VPCID:               "vpc-1",
		SubnetID:            "subnet-1",
		InstanceType:        "t3.micro",
		AMI:                 "ami-12345",
		KeyName:             "mykey",
		SecurityGroupIDs:    []string{"sg-1"},
		IMDSv2Required:      true,
		EnableEbsEncryption: true,
	}
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	y := files["template.yaml"]
	if !strings.Contains(y, "AWS::EC2::Instance") {
		t.Fatalf("missing instance resource: %s", y)
	}
	if !strings.Contains(y, "HttpTokens: required") {
		t.Fatal("expected IMDSv2 metadata options")
	}
}
