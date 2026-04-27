package httpapi

import (
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/aiassist"
)

// handleAIPromptDisclosure GET /api/v1/ai/prompt-disclosure — public, no auth; no secrets.
// Lets clients and operators verify the same system/user prompt the API uses.
func (s *Server) handleAIPromptDisclosure(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	d := aiassist.GetPromptDisclosure()
	writeJSON(w, http.StatusOK, d)
}
