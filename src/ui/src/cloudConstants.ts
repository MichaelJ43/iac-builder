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
  return AWS_REGIONS;
}

export function isAwsCloud(cloud: string): boolean {
  const c = cloud.trim().toLowerCase();
  return c === "" || c === "aws";
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
];
