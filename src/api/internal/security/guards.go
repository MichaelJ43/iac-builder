package security

import (
	"errors"
	"os"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

// OperatorGuardsStatus is returned by GET /api/v1/operator/guards (public; reflects env only).
type OperatorGuardsStatus struct {
	BlockSshOpenWorld         bool `json:"block_ssh_open_world"`
	RequireImdsv2            bool `json:"require_imdsv2"`
	RequireEbsEncryption     bool `json:"require_ebs_encryption"`
	BlockAssociatePublicIP   bool `json:"block_associate_public_ip"`
	AnyEnabled               bool `json:"any_enabled"`
}

// OperatorGuardsStatusFromEnv reads the same IAC_* flags used by EnforceOperatorPreview.
func OperatorGuardsStatusFromEnv() OperatorGuardsStatus {
	b := loadOperatorGuardsBools()
	st := OperatorGuardsStatus{
		BlockSshOpenWorld:       b.blockSSH,
		RequireImdsv2:          b.requireIMDS,
		RequireEbsEncryption:   b.requireEBS,
		BlockAssociatePublicIP: b.blockPublicIP,
	}
	st.AnyEnabled = st.BlockSshOpenWorld || st.RequireImdsv2 || st.RequireEbsEncryption || st.BlockAssociatePublicIP
	return st
}

type operatorGuardsBools struct {
	blockSSH, requireIMDS, requireEBS, blockPublicIP bool
}

func loadOperatorGuardsBools() operatorGuardsBools {
	return operatorGuardsBools{
		blockSSH:     envTruthy(os.Getenv("IAC_BLOCK_SSH_OPEN_WORLD")),
		requireIMDS:  envTruthy(os.Getenv("IAC_REQUIRE_IMDSV2")),
		requireEBS:   envTruthy(os.Getenv("IAC_REQUIRE_EBS_ENCRYPTION")),
		blockPublicIP: envTruthy(os.Getenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP")),
	}
}

// EnforceOperatorPreview returns an error if the self-hosted operator has enabled a
// guard (via IAC_*) and the current wizard state would violate that policy. Callers
// should reject preview (and any future download paths that use the same state) with
// the returned message.
func EnforceOperatorPreview(s gen.WizardState) error {
	b := loadOperatorGuardsBools()
	if b.blockSSH && SSHCidrIsOpenWorld(s.SSHCIDR) {
		return ErrBlockedSSHOpenWorld
	}
	if b.requireIMDS && !s.IMDSv2Required {
		return ErrRequireImdsv2
	}
	if b.requireEBS && !s.EnableEbsEncryption {
		return ErrRequireEbsEncryption
	}
	if b.blockPublicIP && s.AssociatePublicIP {
		return ErrBlockAssociatePublicIP
	}
	return nil
}

// Guard errors (stable messages for clients and operators).
var (
	ErrBlockedSSHOpenWorld = errors.New(
		"operator policy: SSH from 0.0.0.0/0 or ::/0 is not allowed. Restrict ssh_cidr, or unset IAC_BLOCK_SSH_OPEN_WORLD on the API server for local use only",
	)
	ErrRequireImdsv2 = errors.New(
		"operator policy: IMDSv2 is required. Enable “Require IMDSv2” in the wizard, or unset IAC_REQUIRE_IMDSV2 on the API server",
	)
	ErrRequireEbsEncryption = errors.New(
		"operator policy: root EBS encryption is required. Enable “Encrypt root EBS”, or unset IAC_REQUIRE_EBS_ENCRYPTION on the API server",
	)
	ErrBlockAssociatePublicIP = errors.New(
		"operator policy: associating a public IP is not allowed. Turn off “Associate public IP”, or unset IAC_BLOCK_ASSOCIATE_PUBLIC_IP on the API server",
	)
)

func envTruthy(s string) bool {
	t := strings.ToLower(strings.TrimSpace(s))
	return t == "1" || t == "true" || t == "yes" || t == "on"
}
