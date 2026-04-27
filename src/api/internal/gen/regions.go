package gen

import (
	"fmt"
	"strings"
)

// MaxTargetRegions limits how many regions a single preview may target (abuse and UX).
const MaxTargetRegions = 8

// NormalizedRegions returns a deduplicated, ordered list of target regions. Values from Regions take
// precedence; if that slice is empty, legacy Region (single) is used. Order is stable: first occurrence wins.
// Strings are lowercased and trimmed (AWS region ids are case-insensitive).
func NormalizedRegions(s WizardState) []string {
	seen := make(map[string]struct{})
	var out []string
	for _, r := range s.Regions {
		r = strings.ToLower(strings.TrimSpace(r))
		if r == "" {
			continue
		}
		if _, ok := seen[r]; ok {
			continue
		}
		seen[r] = struct{}{}
		out = append(out, r)
	}
	if len(out) == 0 {
		one := strings.ToLower(strings.TrimSpace(s.Region))
		if one != "" {
			out = append(out, one)
		}
	}
	return out
}

// FirstTargetRegion is the first listed region (used for non-AWS “region” string and discovery on the client).
func FirstTargetRegion(s WizardState) string {
	r := NormalizedRegions(s)
	if len(r) == 0 {
		return ""
	}
	return r[0]
}

// RegionProviderAlias returns a valid Terraform provider alias from an AWS region id (e.g. us-east-1 -> us_east_1).
func RegionProviderAlias(region string) string {
	s := strings.ReplaceAll(strings.TrimSpace(region), "-", "_")
	if s == "" {
		return "r"
	}
	if strings.HasPrefix(s, "aws_") {
		return s
	}
	// HCL identifier cannot start with a number in some positions; prefix if needed.
	if len(s) > 0 && s[0] >= '0' && s[0] <= '9' {
		return "r_" + s
	}
	return s
}

// RegionFileLabel returns a filesystem-safe label (e.g. for template.us-east-1.yaml names).
func RegionFileLabel(region string) string {
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(region), " ", ""))
}

// ValidateTargetRegionCount enforces MaxTargetRegions after normalization.
func ValidateTargetRegionCount(s WizardState) error {
	if n := len(NormalizedRegions(s)); n > MaxTargetRegions {
		return fmt.Errorf("%w (at most %d, got %d)", ErrTooManyTargetRegions, MaxTargetRegions, n)
	}
	return nil
}
