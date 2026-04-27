package gen

import (
	"errors"
	"fmt"
	"strings"
)

// ErrFrameworkNeedsAWS is returned when a framework is not implemented for the selected cloud.
var ErrFrameworkNeedsAWS = errors.New(
	"this IaC target is not available for the selected provider; for non-AWS targets use Terraform or OpenTofu (e.g. Google Cloud, OCI, Kubernetes, Ansible, VMware)",
)

func previewNonAWS(s WizardState) (map[string]string, error) {
	switch s.Framework {
	case FrameworkTerraform:
		if isCloudGCP(s.Cloud) {
			return gcpTerraformFiles(s)
		}
		if isCloudOCI(s.Cloud) {
			return ociTerraformFiles(s)
		}
		if isCloudK8s(s.Cloud) {
			return k8sPackagingFiles(s)
		}
		if isCloudAnsible(s.Cloud) {
			return ansibleFiles(s)
		}
		if isCloudVMware(s.Cloud) {
			return vmwareTerraformFiles(s)
		}
	case FrameworkOpenTofu:
		var files map[string]string
		var err error
		switch {
		case isCloudGCP(s.Cloud):
			files, err = gcpTerraformFiles(s)
		case isCloudOCI(s.Cloud):
			files, err = ociTerraformFiles(s)
		case isCloudK8s(s.Cloud):
			files, err = k8sPackagingFiles(s)
		case isCloudAnsible(s.Cloud):
			files, err = ansibleFiles(s)
		case isCloudVMware(s.Cloud):
			files, err = vmwareTerraformFiles(s)
		default:
			return nil, ErrFrameworkNeedsAWS
		}
		if err != nil {
			return nil, err
		}
		if tf, ok := files["main.tf"]; ok {
			files["main.tf"] = openTofuHeader + tf
		}
		return files, nil
	default:
		return nil, ErrFrameworkNeedsAWS
	}
	return nil, ErrInvalidFramework
}

func gcpTerraformFiles(s WizardState) (map[string]string, error) {
	region := strings.TrimSpace(s.Region)
	sub := strings.TrimSpace(s.SubnetID)
	it := strings.TrimSpace(s.InstanceType)
	img := strings.TrimSpace(s.AMI)
	net := strings.TrimSpace(s.VPCID)
	public := s.AssociatePublicIP
	var b strings.Builder
	b.WriteString(`# iac-builder — Google Cloud (Terraform starter, not production-ready)
# Docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  # project = "YOUR_GCP_PROJECT"
  region = `)
	b.WriteString(hclQ(region))
	b.WriteString("\n}\n\n")
	if net != "" {
		fmt.Fprintf(&b, "# Network hint from wizard (VPC / host project): %s\n", net)
	}
	b.WriteString(`resource "google_compute_instance" "this" {
  name         = "iac-builder-export"
  machine_type = `)
	b.WriteString(hclQ(it))
	b.WriteString("\n  zone         = ")
	b.WriteString(hclQ(region + "-a"))
	b.WriteString(" # change zone suffix; must exist in the region\n\n  boot_disk {\n    initialize_params {\n      # wizard \"ami\" = boot image: Debian family, or projects/.../global/images/...\n      image = ")
	b.WriteString(hclQ(img))
	b.WriteString(`    }
  }

  network_interface {
    `)
	if public {
		b.WriteString("access_config {}\n    ")
	}
	b.WriteString("subnetwork = ")
	b.WriteString(hclQ(sub))
	if !public {
		b.WriteString("\n    # no access_config: private instance; add Cloud NAT for egress if needed\n")
	} else {
		b.WriteString("\n")
	}
	b.WriteString("  }\n}\n")
	return map[string]string{"main.tf": b.String()}, nil
}

func ociTerraformFiles(s WizardState) (map[string]string, error) {
	region := strings.TrimSpace(s.Region)
	sub := strings.TrimSpace(s.SubnetID)
	it := strings.TrimSpace(s.InstanceType)
	img := strings.TrimSpace(s.AMI)
	public := s.AssociatePublicIP
	var b strings.Builder
	b.WriteString(`# iac-builder — Oracle Cloud Infrastructure (Terraform starter, not production-ready)
# Docs: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_instance
terraform {
  required_version = ">= 1.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  `)
	b.WriteString("region = ")
	b.WriteString(hclQ(region))
	b.WriteString("\n  # config via ~/.oci/config or OCI env vars; see provider docs\n}\n\n")
	b.WriteString(`resource "oci_core_instance" "this" {
  availability_domain = "REPLACE_AVAILABILITY_DOMAIN"
  compartment_id      = "REPLACE_COMPARTMENT_OCID"
  display_name         = "iac-builder-export"
  shape                = `)
	b.WriteString(hclQ(it))
	b.WriteString(`

  create_vnic_details {
    subnet_id        = `)
	b.WriteString(hclQ(sub))
	b.WriteString("\n    assign_public_ip = " + ociBool(public) + "\n  }\n\n  source_details {\n    source_type = \"image\"\n    source_id   = ")
	b.WriteString(hclQ(img))
	b.WriteString(`  }

  # Add metadata, extended metadata, or instance_options as needed; see OCI provider docs.
}
`)
	return map[string]string{"main.tf": b.String()}, nil
}

func ociBool(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

// hclQ returns a double-quoted HCL string literal.
func hclQ(s string) string { return fmt.Sprintf("%q", s) }
