package gen

type Framework string

const (
	FrameworkTerraform      Framework = "terraform"
	FrameworkOpenTofu       Framework = "opentofu"
	FrameworkCloudFormation Framework = "cloudformation"
	FrameworkPulumi         Framework = "pulumi"
	FrameworkAWSCDK         Framework = "aws_cdk"
	FrameworkCrossplane     Framework = "crossplane"
	FrameworkAzureBicep     Framework = "azure_bicep"
)

func ParseFramework(s string) (Framework, bool) {
	switch Framework(s) {
	case FrameworkTerraform, FrameworkOpenTofu, FrameworkCloudFormation, FrameworkPulumi, FrameworkAWSCDK, FrameworkCrossplane, FrameworkAzureBicep:
		return Framework(s), true
	default:
		return "", false
	}
}

func (f Framework) String() string { return string(f) }
