package gen

import "strings"

// Cloud identifiers (wizard "cloud" JSON field).
const (
	CloudAWS     = "aws"
	CloudGCP     = "gcp"
	CloudOCI     = "oci"
	CloudK8s     = "k8s"
	CloudAnsible = "ansible"
	CloudVMware  = "vmware"
)

// ParseCloud returns the canonical lower-case id or false.
func ParseCloud(s string) (string, bool) {
	c := strings.ToLower(strings.TrimSpace(s))
	switch c {
	case CloudAWS, CloudGCP, CloudOCI, CloudK8s, CloudAnsible, CloudVMware:
		return c, true
	default:
		return "", false
	}
}

// IsCloudAWS is true for the primary supported compute path.
// Empty cloud is treated as AWS for backward compatibility with older clients and tests.
func IsCloudAWS(cloud string) bool {
	c := strings.TrimSpace(strings.ToLower(cloud))
	if c == "" {
		return true
	}
	return c == CloudAWS
}

func isCloudGCP(cloud string) bool {
	c, ok := ParseCloud(cloud)
	return ok && c == CloudGCP
}

func isCloudOCI(cloud string) bool {
	c, ok := ParseCloud(cloud)
	return ok && c == CloudOCI
}

func isCloudK8s(cloud string) bool {
	c, ok := ParseCloud(cloud)
	return ok && c == CloudK8s
}

func isCloudAnsible(cloud string) bool {
	c, ok := ParseCloud(cloud)
	return ok && c == CloudAnsible
}

func isCloudVMware(cloud string) bool {
	c, ok := ParseCloud(cloud)
	return ok && c == CloudVMware
}
