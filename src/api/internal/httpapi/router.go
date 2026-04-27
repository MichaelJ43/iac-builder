package httpapi

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/MichaelJ43/iac-builder/api/internal/aiassist"
	"github.com/MichaelJ43/iac-builder/api/internal/auth"
	"github.com/MichaelJ43/iac-builder/api/internal/gen"
	"github.com/MichaelJ43/iac-builder/api/internal/security"
	"github.com/MichaelJ43/iac-builder/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Server is the main HTTP API. Auth, when set and enabled (AUTH_API_BASE), scopes credential profiles
// to shared-api-platform user ids.
type Server struct {
	Reg     *gen.Registry
	Store   *store.Store
	Version string
	Auth    *auth.Platform

	ailOnce sync.Once
	ail     *aiassist.Limiter
}

func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(s.corsHandler)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Get("/api/v1/version", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"version": s.Version})
	})
	r.Get("/api/v1/auth/status", s.handleAuthStatus)

	// Public: no secrets; same prompt strings the server uses for OpenAI BYOK.
	r.Get("/api/v1/ai/prompt-disclosure", s.handleAIPromptDisclosure)

	r.Post("/api/v1/preview", s.handlePreview)
	r.Post("/api/v1/security/recommendations", s.handleSecurity)

	ai := func(r chi.Router) {
		r.Post("/assist", s.handleAIAssist)
		r.Get("/openai-key", s.handleGetOpenAIKey)
		r.Put("/openai-key", s.handlePutOpenAIKey)
		r.Delete("/openai-key", s.handleDeleteOpenAIKey)
	}
	if s.Auth != nil && s.Auth.Enabled() {
		r.Route("/api/v1/ai", func(r chi.Router) {
			r.Use(s.requirePlatformUser)
			ai(r)
		})
	} else {
		r.Route("/api/v1/ai", ai)
	}

	profile := func(r chi.Router) {
		r.Get("/", s.handleListProfiles)
		r.Post("/", s.handleCreateProfile)
		r.Route("/{id}", func(r chi.Router) {
			r.Delete("/", s.handleDeleteProfile)
			r.Post("/validate", s.handleValidateProfile)
			r.Get("/aws/vpcs", s.handleListVPCs)
			r.Get("/aws/subnets", s.handleListSubnets)
			r.Get("/aws/security-groups", s.handleListSecurityGroups)
			r.Get("/aws/key-pairs", s.handleListKeyPairs)
			r.Get("/aws/ami-suggestions", s.handleListAMISuggestions)
		})
	}
	if s.Auth != nil && s.Auth.Enabled() {
		r.Route("/api/v1/profiles", func(r chi.Router) {
			r.Use(s.requirePlatformUser)
			profile(r)
		})
	} else {
		r.Route("/api/v1/profiles", profile)
	}

	r.Route("/api/v1/presets", func(r chi.Router) {
		r.Get("/", s.handleListPresets)
		r.Post("/", s.handleCreatePreset)
		r.Get("/{id}", s.handleGetPreset)
		r.Delete("/{id}", s.handleDeletePreset)
	})

	return r
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return false
	}
	return true
}

func (s *Server) handlePreview(w http.ResponseWriter, r *http.Request) {
	var body struct {
		State gen.WizardState `json:"state"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	files, err := gen.Preview(r.Context(), s.Reg, body.State)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"files": files})
}

func (s *Server) handleSecurity(w http.ResponseWriter, r *http.Request) {
	var body struct {
		State gen.WizardState `json:"state"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	recs := security.Evaluate(body.State)
	writeJSON(w, http.StatusOK, map[string]any{"recommendations": recs})
}

func (s *Server) handleListProfiles(w http.ResponseWriter, r *http.Request) {
	authOn := s.Auth != nil && s.Auth.Enabled()
	var uid string
	if authOn {
		var ok bool
		uid, ok = s.userIDFromContext(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
	}
	list, err := s.Store.ListProfiles(r.Context(), uid, !authOn)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"profiles": list})
}

func (s *Server) handleCreateProfile(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name            string `json:"name"`
		Cloud           string `json:"cloud"`
		DefaultRegion   string `json:"default_region"`
		AccessKeyID     string `json:"access_key_id"`
		SecretAccessKey string `json:"secret_access_key"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Name == "" || body.Cloud != "aws" || body.DefaultRegion == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, cloud=aws, default_region required"})
		return
	}
	uid := ""
	if s.Auth != nil && s.Auth.Enabled() {
		var ok bool
		uid, ok = s.userIDFromContext(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
	}
	id, err := s.Store.CreateProfile(r.Context(), uid, body.Name, body.Cloud, body.DefaultRegion, store.AWSCreds{
		AccessKeyID: body.AccessKeyID, SecretAccessKey: body.SecretAccessKey,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) handleDeleteProfile(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing id"})
		return
	}
	authOn := s.Auth != nil && s.Auth.Enabled()
	uid := ""
	if authOn {
		u, ok := s.userIDFromContext(r)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		uid = u
	}
	n, err := s.Store.DeleteProfile(r.Context(), id, uid, authOn)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if n == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "profile not found"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
