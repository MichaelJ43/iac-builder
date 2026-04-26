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

// handleAIAssist implements POST /api/v1/ai/assist: validates the versioned context JSON,
// applies a per-IP rate limit, and returns a stub (no third-party model yet).
func (s *Server) handleAIAssist(w http.ResponseWriter, r *http.Request) {
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
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":   true,
		"mode": "stub",
		"message": "No language model is configured on this server. " +
			"Your request was received, validated, and applied to your per-IP limit. A future build may wire a model here.",
		"suggestions": "",
	})
}
