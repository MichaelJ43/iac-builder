package gen

import "errors"

var (
	ErrInvalidFramework     = errors.New("invalid or missing framework")
	ErrUnsupportedCloud     = errors.New("unsupported cloud (use aws, gcp, oci, k8s, ansible, or vmware)")
	ErrMissingRegion         = errors.New("region is required")
	ErrTooManyTargetRegions  = errors.New("too many target regions")
	ErrMissingSubnet        = errors.New("subnet_id is required")
	ErrMissingInstanceType  = errors.New("instance_type is required")
	ErrMissingAMI           = errors.New("ami is required")
)
