package httpapi

import (
	"net/http"
)

// byokUserID is the store partition for BYOK data: platform user id when auth is on, or "" for single-tenant (auth off).
func (s *Server) byokUserID(r *http.Request) string {
	if s.Auth != nil && s.Auth.Enabled() {
		if u, ok := s.userIDFromContext(r); ok {
			return u
		}
	}
	return ""
}
