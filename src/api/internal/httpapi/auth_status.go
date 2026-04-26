package httpapi

import (
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/auth"
)

// handleAuthStatus reports whether platform auth is enabled and, if so, the current user id.
func (s *Server) handleAuthStatus(w http.ResponseWriter, r *http.Request) {
	if s.Auth == nil || !s.Auth.Enabled() {
		writeJSON(w, http.StatusOK, map[string]any{"auth": "disabled"})
		return
	}
	uid, err := s.Auth.UserID(r)
	if err != nil {
		if err == auth.ErrUnauthorized {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "auth unavailable"})
		return
	}
	if uid == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"user_id": uid, "auth": "enabled"})
}
