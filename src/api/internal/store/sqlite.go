package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/MichaelJ43/iac-builder/api/internal/crypto"
	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type Store struct {
	db  *sql.DB
	key []byte
}

func OpenSQLite(dsn string, masterKey []byte) (*Store, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	s := &Store{db: db, key: masterKey}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS credential_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cloud TEXT NOT NULL,
  default_region TEXT,
  secret_blob BLOB NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wizard_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  json_data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`)
	return err
}

func (s *Store) Close() error { return s.db.Close() }

type AWSCreds struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
}

func (s *Store) CreateProfile(ctx context.Context, name, cloud, defaultRegion string, creds AWSCreds) (id string, err error) {
	if s.key == nil {
		return "", errors.New("store not configured with master key")
	}
	raw, _ := json.Marshal(creds)
	blob, err := crypto.Encrypt(raw, s.key)
	if err != nil {
		return "", err
	}
	id = uuid.New().String()
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO credential_profiles(id,name,cloud,default_region,secret_blob,created_at) VALUES(?,?,?,?,?,?)`,
		id, name, cloud, defaultRegion, blob, time.Now().UTC().Format(time.RFC3339),
	)
	return id, err
}

func (s *Store) ListProfiles(ctx context.Context) ([]ProfileSummary, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,cloud,default_region,created_at FROM credential_profiles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ProfileSummary
	for rows.Next() {
		var p ProfileSummary
		if err := rows.Scan(&p.ID, &p.Name, &p.Cloud, &p.DefaultRegion, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

type ProfileSummary struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Cloud          string `json:"cloud"`
	DefaultRegion  string `json:"default_region"`
	CreatedAt      string `json:"created_at"`
}

func (s *Store) GetAWSCreds(ctx context.Context, id string) (AWSCreds, string, error) {
	var blob []byte
	var region string
	err := s.db.QueryRowContext(ctx, `SELECT secret_blob, default_region FROM credential_profiles WHERE id=?`, id).Scan(&blob, &region)
	if err != nil {
		return AWSCreds{}, "", err
	}
	plain, err := crypto.Decrypt(blob, s.key)
	if err != nil {
		return AWSCreds{}, "", err
	}
	var c AWSCreds
	if err := json.Unmarshal(plain, &c); err != nil {
		return AWSCreds{}, "", err
	}
	return c, region, nil
}

func (s *Store) CreatePreset(ctx context.Context, name string, data json.RawMessage) (string, error) {
	id := uuid.New().String()
	_, err := s.db.ExecContext(ctx, `INSERT INTO wizard_presets(id,name,json_data,created_at) VALUES(?,?,?,?)`,
		id, name, string(data), time.Now().UTC().Format(time.RFC3339))
	return id, err
}

func (s *Store) ListPresets(ctx context.Context) ([]PresetSummary, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,created_at FROM wizard_presets ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PresetSummary
	for rows.Next() {
		var p PresetSummary
		if err := rows.Scan(&p.ID, &p.Name, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

type PresetSummary struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

func (s *Store) GetPreset(ctx context.Context, id string) (json.RawMessage, error) {
	var js string
	err := s.db.QueryRowContext(ctx, `SELECT json_data FROM wizard_presets WHERE id=?`, id).Scan(&js)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(js), nil
}

func (s *Store) DeletePreset(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM wizard_presets WHERE id=?`, id)
	return err
}
