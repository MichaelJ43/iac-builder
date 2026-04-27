package gen

import (
	"context"
	"strings"
	"testing"
)

func defaultRegistry() *Registry {
	return NewRegistry(
		TerraformEmitter{},
		OpenTofuEmitter{},
		CloudFormationEmitter{},
		PulumiAWSEmitter{},
		CDKAWSEmitter{},
		CrossplaneEC2Emitter{},
		BicepAWSEmitter{},
	)
}

func TestRegistry_For_And_Preview(t *testing.T) {
	r := defaultRegistry()
	s := minimalValidState(FrameworkTerraform)
	for _, fw := range []Framework{
		FrameworkTerraform, FrameworkOpenTofu, FrameworkCloudFormation,
		FrameworkPulumi, FrameworkAWSCDK, FrameworkCrossplane, FrameworkAzureBicep,
	} {
		s.Framework = fw
		em, ok := r.For(fw)
		if !ok {
			t.Fatalf("For(%s)", fw)
		}
		files, err := em.Preview(context.Background(), s)
		if err != nil {
			t.Fatalf("Preview %s: %v", fw, err)
		}
		if len(files) < 1 {
			t.Fatalf("expected at least one file for %s", fw)
		}
	}
	_, ok := r.For(Framework("nope"))
	if ok {
		t.Fatal("expected false for unknown framework")
	}
}

func TestPreview_Integration(t *testing.T) {
	s := minimalValidState(FrameworkOpenTofu)
	_, err := Preview(context.Background(), defaultRegistry(), s)
	if err != nil {
		t.Fatal(err)
	}
	s.Framework = "bad"
	_, err = Preview(context.Background(), defaultRegistry(), s)
	if err == nil {
		t.Fatal("expected error for bad framework")
	}
}

func TestParseFramework(t *testing.T) {
	f, ok := ParseFramework("crossplane")
	if !ok || f != FrameworkCrossplane {
		t.Fatalf("got %v %v", f, ok)
	}
	_, ok = ParseFramework("not-a-framework")
	if ok {
		t.Fatal("expected false")
	}
}

func TestFramework_String(t *testing.T) {
	if FrameworkTerraform.String() != "terraform" {
		t.Fatal(FrameworkTerraform.String())
	}
}

func minimalValidState(fw Framework) WizardState {
	return WizardState{
		Framework:        fw,
		Cloud:            "aws",
		Region:           "us-east-1",
		SubnetID:         "subnet-1",
		InstanceType:     "t3.micro",
		AMI:              "ami-12345",
		SecurityGroupIDs: []string{"sg-1"},
	}
}

func TestOpenTofuEmitter_Preview(t *testing.T) {
	e := OpenTofuEmitter{}
	s := minimalValidState(FrameworkOpenTofu)
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	tf := files["main.tf"]
	if !strings.HasPrefix(tf, "# OpenTofu:") {
		t.Fatalf("expected OpenTofu header in main.tf")
	}
	if !strings.Contains(tf, `resource "aws_instance" "this"`) {
		t.Fatal("expected Terraform-shaped EC2 resource")
	}
}

func TestPulumiAWSEmitter_Preview(t *testing.T) {
	e := PulumiAWSEmitter{}
	s := minimalValidState(FrameworkPulumi)
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(files["index.ts"], `new aws.ec2.Instance`) {
		t.Fatal("expected Pulumi EC2 instance")
	}
	if !strings.Contains(files["Pulumi.yaml"], "us-east-1") {
		t.Fatal("expected region in Pulumi.yaml")
	}
}

func TestCDKAWSEmitter_Preview(t *testing.T) {
	e := CDKAWSEmitter{}
	s := minimalValidState(FrameworkAWSCDK)
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	c := files["ec2-stack.ts"]
	if !strings.Contains(c, "CfnInstance") {
		t.Fatal("expected CDK CfnInstance")
	}
}

func TestBicepAWSEmitter_Preview(t *testing.T) {
	e := BicepAWSEmitter{}
	s := minimalValidState(FrameworkAzureBicep)
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	b := files["main.bicep"]
	if !strings.Contains(b, "param awsRegionLike") {
		t.Fatalf("expected param: %s", b)
	}
}

func TestCrossplaneEC2Emitter_Preview(t *testing.T) {
	e := CrossplaneEC2Emitter{}
	s := minimalValidState(FrameworkCrossplane)
	files, err := e.Preview(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	y := files["ec2-instance.yaml"]
	if !strings.Contains(y, "ec2.aws.upbound.io") || !strings.Contains(y, "kind: Instance") {
		t.Fatal("expected Crossplane EC2 Instance manifest")
	}
}
