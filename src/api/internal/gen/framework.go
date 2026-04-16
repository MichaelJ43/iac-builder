package gen

type Framework string

const (
	FrameworkTerraform       Framework = "terraform"
	FrameworkCloudFormation  Framework = "cloudformation"
	FrameworkPulumi          Framework = "pulumi"
	FrameworkAzureBicep      Framework = "azure_bicep"
	FrameworkAWSCDK          Framework = "aws_cdk"
)

func ParseFramework(s string) (Framework, bool) {
	switch Framework(s) {
	case FrameworkTerraform, FrameworkCloudFormation, FrameworkPulumi, FrameworkAzureBicep, FrameworkAWSCDK:
		return Framework(s), true
	default:
		return "", false
	}
}

func (f Framework) String() string { return string(f) }
