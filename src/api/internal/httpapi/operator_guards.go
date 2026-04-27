package httpapi

import (
	"net/http"

	"github.com/MichaelJ43/iac-builder/api/internal/security"
)

// handleOperatorGuards GET /api/v1/operator/guards — public, no secrets: which IAC_* preview guardrails are active.
func (*Server) handleOperatorGuards(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	g := security.OperatorGuardsStatusFromEnv()
	writeJSON(w, http.StatusOK, g)
}
