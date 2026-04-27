package httpapi

import (
	"net/http"
	"strings"
)

// handleGetOpenAIKey GET /api/v1/ai/openai-key — { "configured": bool, "key_last4": "..." } (never returns the key).
func (s *Server) handleGetOpenAIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	uid := s.byokUserID(r)
	if s.Auth != nil && s.Auth.Enabled() && uid == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	hint, err := s.Store.KeyHintLast4(r.Context(), uid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if hint == "" {
		writeJSON(w, http.StatusOK, map[string]any{
			"configured": false,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"configured": true,
		"key_last4":  hint,
	})
}

// handlePutOpenAIKey PUT /api/v1/ai/openai-key — { "openai_api_key": "sk-…" } (body never logged; encrypted at rest).
func (s *Server) handlePutOpenAIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	uid := s.byokUserID(r)
	if s.Auth != nil && s.Auth.Enabled() && uid == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		OpenaiAPIKey string `json:"openai_api_key"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	k := strings.TrimSpace(body.OpenaiAPIKey)
	if k == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "openai_api_key is required"})
		return
	}
	if !strings.HasPrefix(k, "sk-") || len(k) < 20 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "expected an OpenAI API key (sk-…)"})
		return
	}
	if err := s.Store.SetUserOpenAIKey(r.Context(), uid, k); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleDeleteOpenAIKey DELETE /api/v1/ai/openai-key
func (s *Server) handleDeleteOpenAIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	uid := s.byokUserID(r)
	if s.Auth != nil && s.Auth.Enabled() && uid == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	_, err := s.Store.DeleteUserOpenAIKey(r.Context(), uid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
