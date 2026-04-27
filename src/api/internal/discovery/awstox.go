package discovery

import "github.com/MichaelJ43/iac-builder/api/internal/awsx"

// FromAWSVPCs maps EC2 VPCs to the shared network shape.
func FromAWSVPCs(region string, vpcs []awsx.VPC) []Network {
	out := make([]Network, 0, len(vpcs))
	for _, v := range vpcs {
		out = append(out, Network{
			ID:          v.ID,
			DisplayName: v.ID,
			IsDefault:   v.IsDefault,
			Cloud:       CloudAWS,
			Region:      region,
		})
	}
	return out
}

// FromAWSSubnets maps EC2 subnets.
func FromAWSSubnets(region, networkID string, subs []awsx.Subnet) []Subnet {
	out := make([]Subnet, 0, len(subs))
	for _, sub := range subs {
		out = append(out, Subnet{
			ID:        sub.ID,
			Zone:      sub.AZ,
			NetworkID: networkID,
			Cloud:     CloudAWS,
		})
	}
	return out
}

// FromAWSSecurityGroups maps EC2 security groups.
func FromAWSSecurityGroups(sgs []awsx.SecurityGroup) []SecurityGroup {
	out := make([]SecurityGroup, 0, len(sgs))
	for _, g := range sgs {
		out = append(out, SecurityGroup{ID: g.ID, Name: g.Name})
	}
	return out
}

// FromAWSAMIs maps AMI suggestions to compute images.
func FromAWSAMIs(amis []awsx.AMIInfo) []ComputeImage {
	out := make([]ComputeImage, 0, len(amis))
	for _, a := range amis {
		out = append(out, ComputeImage{ID: a.ID, Name: a.Name, Cloud: CloudAWS})
	}
	return out
}
