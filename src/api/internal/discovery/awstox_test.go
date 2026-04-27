package discovery

import (
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/awsx"
)

func TestFromAWSVPCs(t *testing.T) {
	v := FromAWSVPCs("us-west-2", []awsx.VPC{{ID: "vpc-1", IsDefault: true}})
	if len(v) != 1 || v[0].ID != "vpc-1" || v[0].Cloud != CloudAWS || v[0].Region != "us-west-2" {
		t.Fatalf("got %#v", v)
	}
}
