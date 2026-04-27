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
	if _, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS wizard_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  json_data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`); err != nil {
		return err
	}
	if err := s.migrateCredentialProfiles(); err != nil {
		return err
	}
	return s.migrateUserOpenAIKey()
}

func (s *Store) migrateCredentialProfiles() error {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='credential_profiles'`).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		_, err := s.db.Exec(`
CREATE TABLE credential_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cloud TEXT NOT NULL,
  default_region TEXT,
  secret_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  UNIQUE(user_id, name)
);
`)
		return err
	}
	ok, err := s.columnExists("credential_profiles", "user_id")
	if err != nil {
		return err
	}
	if ok {
		return nil
	}
	return s.rebuildCredentialProfilesForUserID()
}

func (s *Store) columnExists(table, col string) (bool, error) {
	if table != "credential_profiles" {
		return false, errors.New("unsupported table")
	}
	rows, err := s.db.Query(`PRAGMA table_info(credential_profiles)`)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return false, err
		}
		if name == col {
			return true, nil
		}
	}
	return false, rows.Err()
}

func (s *Store) rebuildCredentialProfilesForUserID() error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`
CREATE TABLE credential_profiles_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cloud TEXT NOT NULL,
  default_region TEXT,
  secret_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  UNIQUE(user_id, name)
);
`); err != nil {
		return err
	}
	if _, err := tx.Exec(`
INSERT INTO credential_profiles_new (id, name, cloud, default_region, secret_blob, created_at, user_id)
SELECT id, name, cloud, default_region, secret_blob, created_at, ''
FROM credential_profiles;
`); err != nil {
		return err
	}
	if _, err := tx.Exec(`DROP TABLE credential_profiles`); err != nil {
		return err
	}
	if _, err := tx.Exec(`ALTER TABLE credential_profiles_new RENAME TO credential_profiles`); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) Close() error { return s.db.Close() }

type AWSCreds struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
}

// CreateProfile stores encrypted AWS credentials. userID is the platform subject; use "" when auth is off (legacy/local).
func (s *Store) CreateProfile(ctx context.Context, userID, name, cloud, defaultRegion string, creds AWSCreds) (id string, err error) {
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
		`INSERT INTO credential_profiles(id,name,cloud,default_region,secret_blob,created_at,user_id) VALUES(?,?,?,?,?,?,?)`,
		id, name, cloud, defaultRegion, blob, time.Now().UTC().Format(time.RFC3339), userID,
	)
	return id, err
}

// ListProfiles returns profiles for one user, or all rows when allUsers is true (auth disabled / admin tooling).
func (s *Store) ListProfiles(ctx context.Context, userID string, allUsers bool) ([]ProfileSummary, error) {
	var (
		rows *sql.Rows
		err  error
	)
	if allUsers {
		rows, err = s.db.QueryContext(ctx, `SELECT id,name,cloud,default_region,created_at FROM credential_profiles ORDER BY name`)
	} else {
		rows, err = s.db.QueryContext(ctx, `SELECT id,name,cloud,default_region,created_at FROM credential_profiles WHERE user_id = ? ORDER BY name`, userID)
	}
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

// GetAWSCreds returns decrypted creds. When enforceUser is true, the profile must belong to userID.
func (s *Store) GetAWSCreds(ctx context.Context, id, userID string, enforceUser bool) (AWSCreds, string, error) {
	var (
		blob   []byte
		region string
		err    error
	)
	if enforceUser {
		err = s.db.QueryRowContext(ctx,
			`SELECT secret_blob, default_region FROM credential_profiles WHERE id=? AND user_id=?`, id, userID,
		).Scan(&blob, &region)
	} else {
		err = s.db.QueryRowContext(ctx, `SELECT secret_blob, default_region FROM credential_profiles WHERE id=?`, id).Scan(&blob, &region)
	}
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

// DeleteProfile removes a row by id. When enforceUser is true, the row must belong to userID.
func (s *Store) DeleteProfile(ctx context.Context, id, userID string, enforceUser bool) (int64, error) {
	var res sql.Result
	var err error
	if enforceUser {
		res, err = s.db.ExecContext(ctx, `DELETE FROM credential_profiles WHERE id=? AND user_id=?`, id, userID)
	} else {
		res, err = s.db.ExecContext(ctx, `DELETE FROM credential_profiles WHERE id=?`, id)
	}
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (s *Store) CreatePreset(ctx context.Context, name string, data json.RawMessage) (string, error) {
	id := uuid.New().String()
	_, err := s.db.ExecContext(ctx, `INSERT INTO wizard_presets(id,name,json_data,created_at) VALUES(?,?,?,?)`,
		id, name, string(data), time.Now().UTC().Format(time.RFC3339))
	return id, err
}

func (s *Store) ListPresets(ctx context.Context) ([]PresetSummary, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,created_at,json_data FROM wizard_presets ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PresetSummary
	for rows.Next() {
		var p PresetSummary
		var js string
		if err := rows.Scan(&p.ID, &p.Name, &p.CreatedAt, &js); err != nil {
			return nil, err
		}
		meta, perr := ParsePresetListMeta(js)
		if perr != nil {
			p.FormatVersion, p.Labels = presetFormatV1, nil
		} else {
			p.FormatVersion, p.Labels = meta.FormatVersion, meta.Labels
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

type PresetSummary struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	CreatedAt       string   `json:"created_at"`
	FormatVersion   int      `json:"format_version"`
	Labels          []string `json:"labels,omitempty"`
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
