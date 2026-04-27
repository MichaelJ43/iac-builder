package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/aiassist"
)

func (s *Server) initAILimiter() *aiassist.Limiter {
	s.ailOnce.Do(func() {
		s.ail = aiassist.NewLimiterFromEnv()
	})
	return s.ail
}

// handleAIAssist implements POST /api/v1/ai/assist: validates v1 context, rate-limits, then
// either calls OpenAI with the user’s stored BYOK key or returns a stub.
func (s *Server) handleAIAssist(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	uid := s.byokUserID(r)
	if s.Auth != nil && s.Auth.Enabled() && uid == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	lim := s.initAILimiter()
	if !lim.Allow(clientIPKey(r)) {
		w.Header().Set("Retry-After", "60")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate limit exceeded; try again in a minute"})
		return
	}
	var body struct {
		Context json.RawMessage `json:"context"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if err := aiassist.ValidateContextV1(body.Context); err != nil {
		var msg string
		if errors.Is(err, aiassist.ErrInvalidContext) {
			msg = err.Error()
		} else {
			msg = "invalid request: " + err.Error()
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	key, err := s.Store.GetUserOpenAIKey(r.Context(), uid)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if key == "" {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":   true,
			"mode": "stub",
			"message": "No OpenAI API key saved for your account. Add one under this panel (BYOK) or in " +
				"local mode without auth. The operator does not supply API keys.",
			"suggestions": "",
		})
		return
	}
	suggestions, oerr := aiassist.OpenAIsuggestions(r.Context(), key, string(body.Context))
	if oerr != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": oerr.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"mode":        "openai",
		"message":     "Suggestions from your OpenAI key (verify before applying).",
		"suggestions": suggestions,
	})
}
