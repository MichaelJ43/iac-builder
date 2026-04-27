package aiassist

import (
	"encoding/json"
	"errors"
	"fmt"
)

// ErrInvalidContext is returned when the body is not a supported AI context.
var ErrInvalidContext = errors.New("invalid ai assist context")

type contextV1 struct {
	V      int             `json:"v"`
	App    string          `json:"app"`
	Wizard json.RawMessage `json:"wizard"`
}

// ValidateContextV1 checks JSON for the v1 contract used by the UI (see docs/ai-assist.md).
func ValidateContextV1(raw json.RawMessage) error {
	if len(raw) == 0 {
		return fmt.Errorf("%w: empty context", ErrInvalidContext)
	}
	var c contextV1
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	if c.V != 1 {
		return fmt.Errorf("%w: expected v=1", ErrInvalidContext)
	}
	if c.App != "iac-builder" {
		return fmt.Errorf("%w: app must be iac-builder", ErrInvalidContext)
	}
	if len(c.Wizard) == 0 {
		return fmt.Errorf("%w: missing wizard", ErrInvalidContext)
	}
	return nil
}
