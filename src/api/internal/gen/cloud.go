package gen

import "strings"

// Cloud identifiers (wizard "cloud" JSON field).
const (
	CloudAWS = "aws"
	CloudGCP = "gcp"
	CloudOCI = "oci"
)

// ParseCloud returns the canonical lower-case id or false.
func ParseCloud(s string) (string, bool) {
	c := strings.ToLower(strings.TrimSpace(s))
	switch c {
	case CloudAWS, CloudGCP, CloudOCI:
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
