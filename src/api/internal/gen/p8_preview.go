package gen

import (
	"fmt"
	"strings"
)

func k8sPackagingFiles(s WizardState) (map[string]string, error) {
	ns := strings.TrimSpace(FirstTargetRegion(s))
	if ns == "" {
		ns = "default"
	}
	img := strings.TrimSpace(s.AMI)
	if img == "" {
		img = "nginx:1.25"
	}
	it := strings.TrimSpace(s.InstanceType)
	sub := strings.TrimSpace(s.SubnetID)
	net := strings.TrimSpace(s.VPCID)
	var d strings.Builder
	d.WriteString(`# iac-builder — Kubernetes (starter; not production-ready)
# Map: region = namespace hint; ami = container image; subnet_id = comment for network; vpc_id = network segment comment.
# Apply: kubectl apply -f k8s/
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iac-builder-export
  namespace: `)
	d.WriteString(yamlQ(ns))
	d.WriteString(`
  labels:
    app: iac-builder-export
spec:
  replicas: 1
  selector:
    matchLabels:
      app: iac-builder-export
  template:
    metadata:
      labels:
        app: iac-builder-export
    spec:
      containers:
        - name: app
          image: `)
	d.WriteString(yamlQ(img))
	d.WriteString("\n          ports:\n            - containerPort: 80\n")
	if it != "" {
		d.WriteString("          # instance_type (wizard) → size hints; set resources per your SLOs\n          resources:\n            requests:\n              cpu: \"100m\"\n              memory: \"128Mi\"\n            limits:\n              cpu: \"500m\"\n              memory: \"256Mi\"\n            # was: " + it + "\n")
	} else {
		d.WriteString("          resources:\n            requests:\n              cpu: \"100m\"\n              memory: \"128Mi\"\n            limits:\n              cpu: \"500m\"\n              memory: \"256Mi\"\n")
	}
	if sub != "" || net != "" {
		fmt.Fprintf(&d, "      # network hints: subnet_id=%q vpc_id=%q\n", sub, net)
	}
	var svc strings.Builder
	svc.WriteString(`# iac-builder — Service for iac-builder-export
apiVersion: v1
kind: Service
metadata:
  name: iac-builder-export
  namespace: `)
	svc.WriteString(yamlQ(ns))
	svc.WriteString(`
spec:
  type: ClusterIP
  selector:
    app: iac-builder-export
  ports:
    - port: 80
      targetPort: 80
`)
	return map[string]string{
		"k8s/deployment.yaml": d.String(),
		"k8s/service.yaml":    svc.String(),
	}, nil
}

func ansibleFiles(s WizardState) (map[string]string, error) {
	invName := strings.TrimSpace(FirstTargetRegion(s))
	if invName == "" {
		invName = "onprem"
	}
	sub := strings.TrimSpace(s.SubnetID)
	img := strings.TrimSpace(s.AMI)
	if img == "" {
		img = "registry.example.com/app:latest"
	}
	it := strings.TrimSpace(s.InstanceType)
	net := strings.TrimSpace(s.VPCID)
	var p strings.Builder
	p.WriteString(`# iac-builder — Ansible (starter; not production-ready)
# Map: region = group label; subnet_id = host; ami = image variable; instance_type = flavor.
- name: iac-builder export
  hosts: `)
	grp := strings.ReplaceAll(strings.ReplaceAll(invName, " ", "-"), ".", "-")
	if grp == "" {
		grp = "onprem"
	}
	p.WriteString(grp)
	p.WriteString(`
  become: true
  vars:
    app_image: `)
	p.WriteString(yamlQ(img))
	if it != "" {
		fmt.Fprintf(&p, "\n    # instance_type: %q\n", it)
	}
	if net != "" {
		fmt.Fprintf(&p, "    # vpc_id / network: %q\n", net)
	}
	p.WriteString(`  tasks:
    - name: Ensure example placeholder
      ansible.builtin.debug:
        msg: "Replace with real roles; add vault for secrets; pin your inventory."
`)
	var inv strings.Builder
	fmt.Fprintf(&inv, `# iac-builder — sample inventory
# "subnet_id" in the wizard is mapped to this host line for a single target.
[%s]
`, grp)
	hostLine := sub
	if hostLine == "" {
		hostLine = "192.0.2.10 ansible_user=ec2-user"
	}
	inv.WriteString(hostLine)
	inv.WriteString("\n")
	return map[string]string{
		"ansible/playbook.yml":   p.String(),
		"ansible/inventory.ini": inv.String(),
	}, nil
}

func vmwareTerraformFiles(s WizardState) (map[string]string, error) {
	dc := strings.TrimSpace(FirstTargetRegion(s))
	if dc == "" {
		dc = "DC1"
	}
	pg := strings.TrimSpace(s.SubnetID)
	if pg == "" {
		pg = "VM Network"
	}
	clone := strings.TrimSpace(s.AMI)
	if clone == "" {
		clone = "ubuntu-22.04-template"
	}
	it := strings.TrimSpace(s.InstanceType)
	if it == "" {
		it = "2vcpu-4G"
	}
	folder := strings.TrimSpace(s.VPCID)
	var b strings.Builder
	b.WriteString(`# iac-builder — VMware vSphere (Terraform starter, not production-ready)
# Docs: https://registry.terraform.io/providers/hashicorp/vsphere/latest/docs
terraform {
  required_version = ">= 1.0"
  required_providers {
    vsphere = {
      source  = "hashicorp/vsphere"
      version = "~> 2.0"
    }
  }
}

provider "vsphere" {
  user                 = "YOUR_VSPHERE_USER"
  password             = "YOUR_VSPHERE_PASSWORD" # use env or var; not committed
  vsphere_server       = "vcenter.example.com"
  allow_unverified_ssl = false
}

data "vsphere_datacenter" "this" {
  name = `)
	b.WriteString(hclQ(dc))
	b.WriteString("\n}\n\n")
	if folder != "" {
		b.WriteString(`data "vsphere_folder" "this" {
  path          = `)
		b.WriteString(hclQ("/"+strings.TrimLeft(folder, "/")))
		b.WriteString(`
  datacenter_id = data.vsphere_datacenter.this.id
}

`)
	}
	b.WriteString(`data "vsphere_network" "this" {
  name          = `)
	b.WriteString(hclQ(pg))
	b.WriteString(`
  datacenter_id = data.vsphere_datacenter.this.id
}

data "vsphere_datastore" "this" {
  name          = "datastore1"
  datacenter_id = data.vsphere_datacenter.this.id
}

# Replace with your template VM or content library; clone name from wizard "ami" field
resource "vsphere_virtual_machine" "this" {
  name             = "iac-builder-export"
  resource_pool_id = "REPLACE_WITH_POOL_ID" # e.g. from data or cluster
  datastore_id     = data.vsphere_datastore.this.id
  num_cpus         = 2
  memory           = 4096
  # Map wizard instance_type to sizing (placeholder): `)
	b.WriteString(hclQ(it))
	b.WriteString(`

  network_interface {
    network_id = data.vsphere_network.this.id
  }

  disk {
    label            = "disk0"
    size             = 40
    thin_provisioned = true
  }

  clone {
    template_uuid = "REPLACE_WITH_TEMPLATE_OR_CONTENT_LIBRARY_UUID" # from wizard: `)
	b.WriteString(hclQ(clone))
	b.WriteString(`
  }
}
`)
	return map[string]string{"main.tf": b.String()}, nil
}

// yamlQ returns a double-quoted YAML string literal.
func yamlQ(s string) string { return fmt.Sprintf("%q", s) }
