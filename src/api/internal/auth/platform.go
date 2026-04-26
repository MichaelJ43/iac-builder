// Package auth validates browser sessions with shared-api-platform (or compatible) GET {base}/v1/auth/me.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var (
	// ErrUnauthorized is returned when the platform responds 401/403 or the body is unusable.
	ErrUnauthorized = errors.New("unauthorized")
)

// Config holds environment-driven options for the platform auth client.
type Config struct {
	APIBase  string
	HTTP     *http.Client
	MePath   string
	UserKeys []string
}

// FromEnv returns nil Enabled when AUTH_API_BASE is unset (no auth required on profile routes).
func FromEnv() *Platform {
	base := strings.TrimSpace(os.Getenv("AUTH_API_BASE"))
	if base == "" {
		return nil
	}
	base = strings.TrimRight(base, "/")
	me := strings.TrimSpace(os.Getenv("AUTH_ME_PATH"))
	if me == "" {
		me = "/v1/auth/me"
	}
	keys := []string{"sub"}
	if s := strings.TrimSpace(os.Getenv("AUTH_USER_ID_JSON_KEYS")); s != "" {
		keys = nil
		for _, k := range strings.Split(s, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				keys = append(keys, k)
			}
		}
	}
	if len(keys) == 0 {
		keys = []string{"sub"}
	}
	client := &http.Client{Timeout: 8 * time.Second}
	return &Platform{cfg: Config{APIBase: base, HTTP: client, MePath: me, UserKeys: keys}}
}

// Platform calls the shared API to resolve the signed-in user id.
type Platform struct {
	cfg Config
}

// Enabled is true when AUTH_API_BASE is set.
func (p *Platform) Enabled() bool { return p != nil }

// UserID forwards Cookie and Authorization to GET .../v1/auth/me and extracts a user id.
func (p *Platform) UserID(r *http.Request) (string, error) {
	if p == nil {
		return "", errors.New("auth not configured")
	}
	u, err := url.Parse(p.cfg.APIBase + p.cfg.MePath)
	if err != nil {
		return "", err
	}
	ctx := r.Context()
	if ctx == nil {
		ctx = context.Background()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", err
	}
	if c := r.Header.Get("Cookie"); c != "" {
		req.Header.Set("Cookie", c)
	}
	if a := r.Header.Get("Authorization"); a != "" {
		req.Header.Set("Authorization", a)
	}
	cl := p.cfg.HTTP
	if cl == nil {
		cl = http.DefaultClient
	}
	res, err := cl.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return "", ErrUnauthorized
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("auth/me: status %d", res.StatusCode)
	}
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return "", err
	}
	for _, k := range p.cfg.UserKeys {
		if id := extractStringAtKey(raw, k); id != "" {
			return id, nil
		}
	}
	return "", ErrUnauthorized
}

// extractStringAtKey supports "sub" or dotted paths like "user.id" for top-level and one-level nesting.
func extractStringAtKey(raw map[string]json.RawMessage, key string) string {
	if key == "" {
		return ""
	}
	parts := strings.SplitN(key, ".", 2)
	v, ok := raw[parts[0]]
	if !ok {
		return ""
	}
	if len(parts) == 1 {
		var s string
		if err := json.Unmarshal(v, &s); err == nil && s != "" {
			return s
		}
		return ""
	}
	var inner map[string]json.RawMessage
	if err := json.Unmarshal(v, &inner); err != nil {
		return ""
	}
	w, ok := inner[parts[1]]
	if !ok {
		return ""
	}
	var s string
	_ = json.Unmarshal(w, &s)
	return s
}
