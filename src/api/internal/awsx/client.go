package awsx

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

func ValidateAWS(ctx context.Context, region, akid, secret string) (account string, err error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return "", err
	}
	out, err := sts.NewFromConfig(cfg).GetCallerIdentity(ctx, &sts.GetCallerIdentityInput{})
	if err != nil {
		return "", err
	}
	return aws.ToString(out.Account), nil
}

func ListVPCs(ctx context.Context, region, akid, secret string) ([]VPC, error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return nil, err
	}
	client := ec2.NewFromConfig(cfg)
	out, err := client.DescribeVpcs(ctx, &ec2.DescribeVpcsInput{})
	if err != nil {
		return nil, err
	}
	var vpcs []VPC
	for _, v := range out.Vpcs {
		vpcs = append(vpcs, VPC{ID: aws.ToString(v.VpcId), IsDefault: aws.ToBool(v.IsDefault)})
	}
	return vpcs, nil
}

func ListSubnets(ctx context.Context, region, akid, secret, vpcID string) ([]Subnet, error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return nil, err
	}
	client := ec2.NewFromConfig(cfg)
	out, err := client.DescribeSubnets(ctx, &ec2.DescribeSubnetsInput{
		Filters: []types.Filter{{Name: aws.String("vpc-id"), Values: []string{vpcID}}},
	})
	if err != nil {
		return nil, err
	}
	var subs []Subnet
	for _, s := range out.Subnets {
		subs = append(subs, Subnet{ID: aws.ToString(s.SubnetId), AZ: aws.ToString(s.AvailabilityZone)})
	}
	return subs, nil
}

type VPC struct {
	ID        string `json:"id"`
	IsDefault bool   `json:"is_default"`
}

type Subnet struct {
	ID string `json:"id"`
	AZ string `json:"az"`
}

// SecurityGroup is a suggestible security group in a VPC.
type SecurityGroup struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// KeyPair is a key pair name in the region.
type KeyPair struct {
	Name string `json:"name"`
}

// AMIInfo is a suggested machine image.
type AMIInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func staticCfg(ctx context.Context, region, akid, secret string) (aws.Config, error) {
	return config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(akid, secret, "")),
	)
}

// ListSecurityGroups returns security groups in the VPC.
func ListSecurityGroups(ctx context.Context, region, akid, secret, vpcID string) ([]SecurityGroup, error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return nil, err
	}
	client := ec2.NewFromConfig(cfg)
	out, err := client.DescribeSecurityGroups(ctx, &ec2.DescribeSecurityGroupsInput{
		Filters: []types.Filter{{Name: aws.String("vpc-id"), Values: []string{vpcID}}},
	})
	if err != nil {
		return nil, err
	}
	var sgs []SecurityGroup
	for _, g := range out.SecurityGroups {
		sgs = append(sgs, SecurityGroup{
			ID:   aws.ToString(g.GroupId),
			Name: aws.ToString(g.GroupName),
		})
	}
	return sgs, nil
}

// ListKeyPairs returns EC2 key pair names in the region.
func ListKeyPairs(ctx context.Context, region, akid, secret string) ([]KeyPair, error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return nil, err
	}
	client := ec2.NewFromConfig(cfg)
	out, err := client.DescribeKeyPairs(ctx, &ec2.DescribeKeyPairsInput{})
	if err != nil {
		return nil, err
	}
	var keys []KeyPair
	for _, k := range out.KeyPairs {
		keys = append(keys, KeyPair{Name: aws.ToString(k.KeyName)})
	}
	return keys, nil
}

// DefaultAMIInfo returns a small set of suggested AMIs: latest Amazon Linux 2 and Amazon Linux 2023 from SSM public parameters.
func DefaultAMIInfo(ctx context.Context, region, akid, secret string) ([]AMIInfo, error) {
	cfg, err := staticCfg(ctx, region, akid, secret)
	if err != nil {
		return nil, err
	}
	svc := ssm.NewFromConfig(cfg)
	paths := []struct {
		path string
		name string
	}{
		{"/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2", "Amazon Linux 2 (latest, x86, gp2 template)"},
		{"/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64", "Amazon Linux 2023 (latest, x86 template)"},
	}
	var out []AMIInfo
	for _, p := range paths {
		res, err := svc.GetParameter(ctx, &ssm.GetParameterInput{Name: aws.String(p.path)})
		if err != nil {
			continue
		}
		if v := res.Parameter; v != nil && v.Value != nil {
			amiID := aws.ToString(v.Value)
			if amiID != "" {
				out = append(out, AMIInfo{ID: amiID, Name: p.name})
			}
		}
	}
	return out, nil
}
