package security

import (
	"errors"
	"os"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

// EnforceOperatorPreview returns an error if the self-hosted operator has enabled a
// guard (via IAC_*) and the current wizard state would violate that policy. Callers
// should reject preview (and any future download paths that use the same state) with
// the returned message.
func EnforceOperatorPreview(s gen.WizardState) error {
	if !envTruthy(os.Getenv("IAC_BLOCK_SSH_OPEN_WORLD")) {
		return nil
	}
	if SSHCidrIsOpenWorld(s.SSHCIDR) {
		return ErrBlockedSSHOpenWorld
	}
	return nil
}

// ErrBlockedSSHOpenWorld is returned when IAC_BLOCK_SSH_OPEN_WORLD is set and
// ssh_cidr is 0.0.0.0/0 or ::/0.
var ErrBlockedSSHOpenWorld = errors.New(
	"operator policy: SSH from 0.0.0.0/0 or ::/0 is not allowed. Restrict ssh_cidr, or unset IAC_BLOCK_SSH_OPEN_WORLD on the API server for local use only",
)

func envTruthy(s string) bool {
	t := strings.ToLower(strings.TrimSpace(s))
	return t == "1" || t == "true" || t == "yes" || t == "on"
}
