package gen

import "strings"

// WizardState is the canonical wizard payload for preview/download.
type WizardState struct {
	Framework Framework `json:"framework"`
	Cloud     string    `json:"cloud"` // "aws" | "gcp" | "oci" | "k8s" | "ansible" | "vmware"

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
	// Optional: refer to an existing secret by name (not the secret value). Terraform emits data sources;
	// set IAM on the instance role. Leave empty to omit.
	AppSecretsManagerSecretName string `json:"app_secretsmanager_secret_name"`
	AppSSMParameterName         string `json:"app_ssm_parameter_name"`
}

func (s WizardState) Validate() error {
	if _, ok := ParseFramework(string(s.Framework)); !ok || s.Framework == "" {
		return ErrInvalidFramework
	}
	cloud := strings.TrimSpace(s.Cloud)
	if cloud == "" {
		cloud = CloudAWS
	}
	if _, ok := ParseCloud(cloud); !ok {
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
