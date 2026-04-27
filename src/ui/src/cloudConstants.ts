import { type CloudId } from "./api";
import { AWS_REGIONS } from "./awsConstants";

/** Curated regions for combobox shortcuts; users may type any valid region. */
export const GCP_REGIONS: string[] = [
  "us-central1",
  "us-east1",
  "us-east4",
  "us-west1",
  "europe-west1",
  "europe-west2",
  "asia-southeast1",
  "australia-southeast1",
];

/** Oracle Cloud public regions (sample). */
export const OCI_REGIONS: string[] = [
  "us-ashburn-1",
  "us-phoenix-1",
  "us-chicago-1",
  "eu-frankfurt-1",
  "uk-london-1",
  "ap-sydney-1",
];

export function regionSuggestionsForCloud(cloud: string): string[] {
  const c = cloud.toLowerCase();
  if (c === "gcp") {
    return GCP_REGIONS;
  }
  if (c === "oci") {
    return OCI_REGIONS;
  }
  if (c === "k8s") {
    return ["production", "staging", "default", "kube-system"];
  }
  if (c === "ansible") {
    return ["on-prem", "datacenter-a", "prod", "staging"];
  }
  if (c === "vmware") {
    return ["DC1", "DC2", "west-dc", "east-dc"];
  }
  return AWS_REGIONS;
}

export function isAwsCloud(cloud: string): boolean {
  const c = cloud.trim().toLowerCase();
  return c === "" || c === "aws";
}

/** Region combobox placeholder by target (wizard “region” maps differently per target). */
export function regionPlaceholderForCloud(cloud: string): string {
  const c = cloud.toLowerCase();
  if (c === "aws" || c === "") {
    return "us-east-1";
  }
  if (c === "gcp") {
    return "us-central1";
  }
  if (c === "oci") {
    return "us-ashburn-1";
  }
  if (c === "k8s") {
    return "default or production";
  }
  if (c === "ansible") {
    return "on-prem";
  }
  if (c === "vmware") {
    return "DC1";
  }
  return "us-east-1";
}

export function regionFieldHelp(cloud: string): string {
  const c = cloud.toLowerCase();
  if (c === "k8s") {
    return "Type a namespace or context label; the list is a shortcut for Kubernetes.";
  }
  if (c === "ansible") {
    return "Type an inventory group or site name; the list is a shortcut for Ansible.";
  }
  if (c === "vmware") {
    return "Type a vSphere datacenter name; the list is a shortcut.";
  }
  if (c === "gcp" || c === "oci" || c === "aws" || c === "") {
    return "Type any valid region; the list is a shortcut for the selected cloud.";
  }
  return "Type a valid value for the selected target; the list is a shortcut.";
}

export function vpcFieldPlaceholder(cloud: string): string {
  if (isAwsCloud(cloud)) {
    return "vpc-... (optional)";
  }
  const c = cloud.toLowerCase();
  if (c === "gcp") {
    return "projects/.../...";
  }
  if (c === "oci") {
    return "ocid1...";
  }
  if (c === "k8s") {
    return "segment (optional)";
  }
  if (c === "ansible") {
    return "site or group (optional)";
  }
  if (c === "vmware") {
    return "/vm/folder (optional)";
  }
  return "id…";
}

export function subnetFieldPlaceholder(cloud: string): string {
  if (isAwsCloud(cloud)) {
    return "subnet-...";
  }
  const c = cloud.toLowerCase();
  if (c === "gcp") {
    return "subnetwork or path…";
  }
  if (c === "oci") {
    return "subnet OCID…";
  }
  if (c === "k8s") {
    return "CNI or subnet (optional)";
  }
  if (c === "ansible") {
    return "host IP or DNS";
  }
  if (c === "vmware") {
    return "port group name";
  }
  return "value…";
}

export function imageFieldPlaceholder(cloud: string): string {
  if (isAwsCloud(cloud)) {
    return "ami-...";
  }
  const c = cloud.toLowerCase();
  if (c === "gcp") {
    return "debian-12";
  }
  if (c === "oci") {
    return "ocid1.image…";
  }
  if (c === "k8s") {
    return "docker.io/library/nginx:1.25";
  }
  if (c === "ansible") {
    return "registry.example.com/app:tag";
  }
  if (c === "vmware") {
    return "template or library item";
  }
  return "image";
}

export function instanceTypeFieldPlaceholder(cloud: string): string {
  const c = cloud.toLowerCase();
  if (c === "k8s" || c === "ansible" || c === "vmware") {
    return "2 vCPU / 4G (example)";
  }
  return "t3.micro";
}

export function instanceTypeFieldHelp(cloud: string): string {
  const c = cloud.toLowerCase();
  if (c === "k8s" || c === "ansible" || c === "vmware") {
    return "Hint for the generated starter (resources, flavor, or template sizing); use values that match your environment.";
  }
  return "Pick a common size or type your own (must exist in the region / account limits).";
}

/** Labels for network / subnet / image fields in the form. */
export function networkFieldLabels(cloud: string): { vpc: string; subnet: string; image: string; instance: string } {
  const c = cloud.toLowerCase();
  if (c === "gcp") {
    return {
      vpc: "VPC network (optional)",
      subnet: "Subnetwork",
      image: "Boot image",
      instance: "Machine type",
    };
  }
  if (c === "oci") {
    return {
      vpc: "VCN OCID (optional)",
      subnet: "Subnet OCID",
      image: "Image OCID",
      instance: "Shape",
    };
  }
  if (c === "k8s") {
    return {
      vpc: "Network / segment (optional)",
      subnet: "Service subnet / CNI ref (optional)",
      image: "Container image",
      instance: "CPU / memory class (hint)",
    };
  }
  if (c === "ansible") {
    return {
      vpc: "Inventory group / site (optional)",
      subnet: "Target host (IP or DNS)",
      image: "Container or package image ref",
      instance: "Flavor / vCPU (hint)",
    };
  }
  if (c === "vmware") {
    return {
      vpc: "Folder path (optional)",
      subnet: "Port group / network name",
      image: "Template or content library name",
      instance: "vCPU & memory (hint)",
    };
  }
  return {
    vpc: "VPC ID (optional)",
    subnet: "Subnet ID",
    image: "AMI ID",
    instance: "Instance type",
  };
}

export const CLOUD_OPTIONS: { value: CloudId; label: string }[] = [
  { value: "aws", label: "Amazon Web Services" },
  { value: "gcp", label: "Google Cloud" },
  { value: "oci", label: "Oracle Cloud Infrastructure" },
  { value: "k8s", label: "Kubernetes" },
  { value: "ansible", label: "Ansible (on-prem)" },
  { value: "vmware", label: "VMware vSphere" },
];
