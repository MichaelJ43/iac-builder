package httpapi

import (
	"context"
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/auth"
)

func (s *Server) requirePlatformUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.Auth == nil || !s.Auth.Enabled() {
			next.ServeHTTP(w, r)
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
		ctx := context.WithValue(r.Context(), ctxKeyUserID, uid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) userIDFromContext(r *http.Request) (string, bool) {
	v, ok := r.Context().Value(ctxKeyUserID).(string)
	return v, ok && v != ""
}
