package gen

// WizardState is the canonical wizard payload for preview/download.
type WizardState struct {
	Framework Framework `json:"framework"`
	Cloud     string    `json:"cloud"` // "aws" | "azure"

	Region string `json:"region"`

	// AWS EC2 slice
	VPCID              string   `json:"vpc_id"`
	SubnetID           string   `json:"subnet_id"`
	InstanceType       string   `json:"instance_type"`
	AMI                string   `json:"ami"`
	KeyName            string   `json:"key_name"`
	SecurityGroupIDs   []string `json:"security_group_ids"`
	AssociatePublicIP  bool     `json:"associate_public_ip"`
	IMDSv2Required     bool     `json:"imdsv2_required"`
	SSHCIDR            string   `json:"ssh_cidr"` // e.g. 203.0.113.10/32 for security hints
	EnableEbsEncryption bool    `json:"enable_ebs_encryption"`
}

func (s WizardState) Validate() error {
	if _, ok := ParseFramework(string(s.Framework)); !ok || s.Framework == "" {
		return ErrInvalidFramework
	}
	if s.Cloud != "aws" {
		return ErrUnsupportedCloud
	}
	if s.Region == "" {
		return ErrMissingRegion
	}
	if s.SubnetID == "" {
		return ErrMissingSubnet
	}
	if s.InstanceType == "" {
		return ErrMissingInstanceType
	}
	if s.AMI == "" {
		return ErrMissingAMI
	}
	return nil
}
