package crypto

import (
	"encoding/hex"
	"errors"
)

// ParseMasterKey decodes IAC_MASTER_KEY as 64 hex chars (32 bytes).
func ParseMasterKey(s string) ([]byte, error) {
	if s == "" {
		return nil, errors.New("IAC_MASTER_KEY is required for encrypted profile storage")
	}
	b, err := hex.DecodeString(s)
	if err != nil {
		return nil, err
	}
	if len(b) != 32 {
		return nil, errors.New("IAC_MASTER_KEY must decode to 32 bytes (64 hex chars)")
	}
	return b, nil
}
