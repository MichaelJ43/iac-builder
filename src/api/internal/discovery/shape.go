// Package discovery defines a cloud-neutral JSON shape for network discovery in the iac-builder API.
// AWS is fully wired; GCP and OCI return empty lists until distinct credential types exist.
package discovery

// Cloud identifiers match wizard and profile cloud fields.
const (
	CloudAWS = "aws"
	CloudGCP = "gcp"
	CloudOCI = "oci"
)

// Network is a virtual network in any supported cloud (VPC, VPC network, VCN, …).
type Network struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name,omitempty"`
	IsDefault   bool   `json:"is_default"`
	Cloud       string `json:"cloud"`
	Region      string `json:"region,omitempty"`
}

// Subnet is a subnetwork within a parent network.
type Subnet struct {
	ID        string `json:"id"`
	Zone      string `json:"zone"`
	NetworkID string `json:"network_id"`
	Cloud     string `json:"cloud"`
}

// SecurityGroup is a network security assignment (AWS SG; other clouds may map to firewall groups).
type SecurityGroup struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

// ComputeImage is a suggestible boot / machine image.
type ComputeImage struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Cloud string `json:"cloud"`
}

// NetworksResponse is the payload for GET .../discovery/networks.
type NetworksResponse struct {
	Cloud   string     `json:"cloud"`
	Region  string     `json:"region"`
	Networks []Network `json:"networks"`
	// Status is "ok" when listing succeeded, or "unavailable" when the cloud is not wired for live discovery.
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// SubnetsResponse is the payload for GET .../discovery/subnets.
type SubnetsResponse struct {
	Cloud   string   `json:"cloud"`
	Region  string   `json:"region"`
	NetworkID string `json:"network_id"`
	Subnets  []Subnet `json:"subnets"`
	Status  string  `json:"status"`
	Message string  `json:"message,omitempty"`
}

// SecurityGroupsResponse for GET .../discovery/security-groups.
type SecurityGroupsResponse struct {
	Cloud   string         `json:"cloud"`
	Region  string         `json:"region"`
	NetworkID string       `json:"network_id"`
	Groups  []SecurityGroup `json:"security_groups"`
	Status  string         `json:"status"`
	Message string         `json:"message,omitempty"`
}

// ComputeImagesResponse for GET .../discovery/compute-images.
type ComputeImagesResponse struct {
	Cloud  string         `json:"cloud"`
	Region string         `json:"region"`
	Images []ComputeImage `json:"images"`
	Status  string         `json:"status"`
	Message string         `json:"message,omitempty"`
}

const StatusOK = "ok"
const StatusUnavailable = "unavailable"
