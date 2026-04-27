package httpapi

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/ops"
	"github.com/go-chi/chi/v5/middleware"
)

const telemetryConsentHeader = "X-IAC-Telemetry-Consent"

// handleOperations GET /api/v1/operations — public; deployment/region/telemetry/posture (no secrets).
func (s *Server) handleOperations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	rt := s.ops()
	writeJSON(w, http.StatusOK, rt.PublicJSON(s.Version))
}

// telemetryBody is a minimal anonymous event (no wizard state, no credentials).
type telemetryBody struct {
	Event string            `json:"event"`
	Props map[string]string `json:"props,omitempty"`
}

// handleOperationsTelemetry POST /api/v1/operations/telemetry — only when IAC_TELEMETRY_OPT_IN=1 on the server
// and the client sends X-IAC-Telemetry-Consent: opt-in.
func (s *Server) handleOperationsTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	rt := s.ops()
	if !rt.TelemetryServerOn {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "telemetry is not enabled on this server (IAC_TELEMETRY_OPT_IN)",
		})
		return
	}
	if strings.TrimSpace(r.Header.Get(telemetryConsentHeader)) != "opt-in" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "set header " + telemetryConsentHeader + ": opt-in to send anonymous events",
		})
		return
	}
	b, err := io.ReadAll(io.LimitReader(r.Body, 8192))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "read body"})
		return
	}
	var ev telemetryBody
	if len(strings.TrimSpace(string(b))) > 0 {
		if err := json.Unmarshal(b, &ev); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
	}
	if len(ev.Event) > 200 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "event too long"})
		return
	}
	if len(ev.Props) > 32 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "too many props"})
		return
	}
	reqID := middleware.GetReqID(r.Context())
	// One structured log line; never log request bodies beyond whitelisted fields.
	log.Printf("iac.telemetry event=%q request_id=%q props_count=%d", ev.Event, reqID, len(ev.Props))
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) ops() *ops.Runtime {
	if s == nil || s.Ops == nil {
		return ops.Test()
	}
	return s.Ops
}
