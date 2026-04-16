package awsx

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

func ValidateAWS(ctx context.Context, region, akid, secret string) (account string, err error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(akid, secret, "")),
	)
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
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(akid, secret, "")),
	)
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
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(akid, secret, "")),
	)
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
