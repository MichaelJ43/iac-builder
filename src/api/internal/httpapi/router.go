package httpapi

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
	"github.com/MichaelJ43/iac-builder/api/internal/security"
	"github.com/MichaelJ43/iac-builder/api/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	Reg     *gen.Registry
	Store   *store.Store
	Version string
}

func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(cors)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Get("/api/v1/version", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"version": s.Version})
	})

	r.Post("/api/v1/preview", s.handlePreview)
	r.Post("/api/v1/security/recommendations", s.handleSecurity)

	r.Route("/api/v1/profiles", func(r chi.Router) {
		r.Get("/", s.handleListProfiles)
		r.Post("/", s.handleCreateProfile)
		r.Route("/{id}", func(r chi.Router) {
			r.Post("/validate", s.handleValidateProfile)
			r.Get("/aws/vpcs", s.handleListVPCs)
			r.Get("/aws/subnets", s.handleListSubnets)
		})
	})

	r.Route("/api/v1/presets", func(r chi.Router) {
		r.Get("/", s.handleListPresets)
		r.Post("/", s.handleCreatePreset)
		r.Get("/{id}", s.handleGetPreset)
		r.Delete("/{id}", s.handleDeletePreset)
	})

	return r
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := os.Getenv("CORS_ORIGIN")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
	list, err := s.Store.ListProfiles(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"profiles": list})
}

func (s *Server) handleCreateProfile(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name           string `json:"name"`
		Cloud          string `json:"cloud"`
		DefaultRegion  string `json:"default_region"`
		AccessKeyID    string `json:"access_key_id"`
		SecretAccessKey string `json:"secret_access_key"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Name == "" || body.Cloud != "aws" || body.DefaultRegion == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, cloud=aws, default_region required"})
		return
	}
	id, err := s.Store.CreateProfile(r.Context(), body.Name, body.Cloud, body.DefaultRegion, store.AWSCreds{
		AccessKeyID: body.AccessKeyID, SecretAccessKey: body.SecretAccessKey,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}
