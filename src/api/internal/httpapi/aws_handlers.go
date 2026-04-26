package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/awsx"
	"github.com/go-chi/chi/v5"
)

func (s *Server) handleValidateProfile(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Region string `json:"region"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&body)
	}
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	region := strings.TrimSpace(body.Region)
	if region == "" {
		region = defReg
	}
	account, err := awsx.ValidateAWS(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"account": account, "region": region})
}

func (s *Server) handleListVPCs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	region := r.URL.Query().Get("region")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	if region == "" {
		region = defReg
	}
	vpcs, err := awsx.ListVPCs(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vpcs": vpcs})
}

func (s *Server) handleListSubnets(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	region := r.URL.Query().Get("region")
	vpcID := r.URL.Query().Get("vpc_id")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	if region == "" {
		region = defReg
	}
	if vpcID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "vpc_id query required"})
		return
	}
	subs, err := awsx.ListSubnets(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey, vpcID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subnets": subs})
}

func (s *Server) handleListSecurityGroups(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	region := r.URL.Query().Get("region")
	vpcID := r.URL.Query().Get("vpc_id")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	if region == "" {
		region = defReg
	}
	if vpcID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "vpc_id query required"})
		return
	}
	sgs, err := awsx.ListSecurityGroups(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey, vpcID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"security_groups": sgs})
}

func (s *Server) handleListKeyPairs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	region := r.URL.Query().Get("region")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	if region == "" {
		region = defReg
	}
	keys, err := awsx.ListKeyPairs(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"key_pairs": keys})
}

func (s *Server) handleListAMISuggestions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	region := r.URL.Query().Get("region")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	if region == "" {
		region = defReg
	}
	amis, err := awsx.DefaultAMIInfo(r.Context(), region, creds.AccessKeyID, creds.SecretAccessKey)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"amis": amis})
}

func (s *Server) handleCreatePreset(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string          `json:"name"`
		Data json.RawMessage `json:"data"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name required"})
		return
	}
	id, err := s.Store.CreatePreset(r.Context(), body.Name, body.Data)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (s *Server) handleGetPreset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	data, err := s.Store.GetPreset(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleDeletePreset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.Store.DeletePreset(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListPresets(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListPresets(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"presets": list})
}
