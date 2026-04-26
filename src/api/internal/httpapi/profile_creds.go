package httpapi

import (
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/store"
)

func (s *Server) getProfileCreds(w http.ResponseWriter, r *http.Request, profileID string) (store.AWSCreds, string, bool) {
	enforce := s.Auth != nil && s.Auth.Enabled()
	var userID string
	if enforce {
		uid, ok := s.userIDFromContext(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return store.AWSCreds{}, "", false
		}
		userID = uid
	}
	creds, region, err := s.Store.GetAWSCreds(r.Context(), profileID, userID, enforce)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "profile not found"})
		return store.AWSCreds{}, "", false
	}
	return creds, region, true
}
