package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/MichaelJ43/iac-builder/api/internal/crypto"
)

type openaiKeyRecord struct {
	Key string `json:"api_key"`
}

func (s *Store) migrateUserOpenAIKey() error {
	_, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS user_openai_key (
  user_id TEXT NOT NULL PRIMARY KEY,
  secret_blob BLOB NOT NULL,
  updated_at TEXT NOT NULL
);
`)
	return err
}

// SetUserOpenAIKey stores a BYOK OpenAI API key (sk-...), replacing any prior key for this user.
// userID is "" when platform auth is off (single-tenant / local only).
func (s *Store) SetUserOpenAIKey(ctx context.Context, userID, apiKey string) error {
	if s.key == nil {
		return errors.New("store not configured with master key")
	}
	if apiKey == "" {
		return errors.New("api key is required")
	}
	raw, _ := json.Marshal(openaiKeyRecord{Key: apiKey})
	blob, err := crypto.Encrypt(raw, s.key)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO user_openai_key(user_id, secret_blob, updated_at) VALUES(?,?,?)
		 ON CONFLICT(user_id) DO UPDATE SET secret_blob=excluded.secret_blob, updated_at=excluded.updated_at`,
		userID, blob, now,
	)
	return err
}

// GetUserOpenAIKey returns the decrypted key, or empty string and no error if missing.
// When enforceUser is true, only rows for userID match; when false, only userID "".
func (s *Store) GetUserOpenAIKey(ctx context.Context, userID string) (key string, err error) {
	var blob []byte
	err = s.db.QueryRowContext(ctx, `SELECT secret_blob FROM user_openai_key WHERE user_id = ?`, userID).Scan(&blob)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	plain, err := crypto.Decrypt(blob, s.key)
	if err != nil {
		return "", err
	}
	var rec openaiKeyRecord
	if err := json.Unmarshal(plain, &rec); err != nil {
		return "", err
	}
	return rec.Key, nil
}

// DeleteUserOpenAIKey removes the stored key for a user. Returns rows affected.
func (s *Store) DeleteUserOpenAIKey(ctx context.Context, userID string) (int64, error) {
	res, err := s.db.ExecContext(ctx, `DELETE FROM user_openai_key WHERE user_id = ?`, userID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// KeyHintLast4 returns a display hint (last 4) without decrypting in caller — decrypts once here.
func (s *Store) KeyHintLast4(ctx context.Context, userID string) (string, error) {
	k, err := s.GetUserOpenAIKey(ctx, userID)
	if err != nil || k == "" {
		return "", err
	}
	if len(k) < 4 {
		return "****", nil
	}
	return k[len(k)-4:], nil
}
