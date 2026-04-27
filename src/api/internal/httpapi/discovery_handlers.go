package httpapi

import (
	"net/http"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/awsx"
	"github.com/MichaelJ43/iac-builder/api/internal/discovery"
	"github.com/go-chi/chi/v5"
)

func (s *Server) handleDiscoveryNetworks(w http.ResponseWriter, r *http.Request) {
	region := strings.TrimSpace(r.URL.Query().Get("region"))
	cloud := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("cloud")))
	if cloud == "" {
		cloud = discovery.CloudAWS
	}
	if region == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "region query required"})
		return
	}
	switch cloud {
	case discovery.CloudAWS:
		id := chi.URLParam(r, "id")
		creds, defReg, ok := s.getProfileCreds(w, r, id)
		if !ok {
			return
		}
		reg := region
		if reg == "" {
			reg = defReg
		}
		vpcs, err := awsx.ListVPCs(r.Context(), reg, creds.AccessKeyID, creds.SecretAccessKey)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, discovery.NetworksResponse{
			Cloud:    discovery.CloudAWS,
			Region:   reg,
			Networks: discovery.FromAWSVPCs(reg, vpcs),
			Status:   discovery.StatusOK,
		})
		return
	case discovery.CloudGCP, discovery.CloudOCI, discovery.CloudK8s, discovery.CloudAnsible, discovery.CloudVMware:
		writeJSON(w, http.StatusOK, discovery.NetworksResponse{
			Cloud:   cloud,
			Region:  region,
			Networks: nil,
			Status:  discovery.StatusUnavailable,
			Message: "Live discovery is not wired for this target; credential profiles are AWS-only. Enter values manually, or add provider-specific API integration later.",
		})
		return
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown cloud; use aws, gcp, oci, k8s, ansible, or vmware"})
	}
}

func (s *Server) handleDiscoverySubnets(w http.ResponseWriter, r *http.Request) {
	region := strings.TrimSpace(r.URL.Query().Get("region"))
	networkID := strings.TrimSpace(r.URL.Query().Get("network_id"))
	cloud := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("cloud")))
	if cloud == "" {
		cloud = discovery.CloudAWS
	}
	if networkID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "network_id query required"})
		return
	}
	if region == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "region query required"})
		return
	}
	if cloud == discovery.CloudAWS {
		id := chi.URLParam(r, "id")
		creds, defReg, ok := s.getProfileCreds(w, r, id)
		if !ok {
			return
		}
		reg := region
		if reg == "" {
			reg = defReg
		}
		subs, err := awsx.ListSubnets(r.Context(), reg, creds.AccessKeyID, creds.SecretAccessKey, networkID)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, discovery.SubnetsResponse{
			Cloud:     discovery.CloudAWS,
			Region:    reg,
			NetworkID: networkID,
			Subnets:   discovery.FromAWSSubnets(reg, networkID, subs),
			Status:    discovery.StatusOK,
		})
		return
	}
	if cloud == discovery.CloudGCP || cloud == discovery.CloudOCI || cloud == discovery.CloudK8s || cloud == discovery.CloudAnsible || cloud == discovery.CloudVMware {
		writeJSON(w, http.StatusOK, discovery.SubnetsResponse{
			Cloud:     cloud,
			Region:    region,
			NetworkID: networkID,
			Subnets:   nil,
			Status:    discovery.StatusUnavailable,
			Message:   "Subnets for this target are not listed via the API yet; paste subnet or network values manually.",
		})
		return
	}
	writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown cloud; use aws, gcp, oci, k8s, ansible, or vmware"})
}

func (s *Server) handleDiscoverySecurityGroups(w http.ResponseWriter, r *http.Request) {
	region := strings.TrimSpace(r.URL.Query().Get("region"))
	networkID := strings.TrimSpace(r.URL.Query().Get("network_id"))
	cloud := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("cloud")))
	if cloud == "" {
		cloud = discovery.CloudAWS
	}
	if networkID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "network_id query required"})
		return
	}
	if region == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "region query required"})
		return
	}
	if cloud != discovery.CloudAWS {
		writeJSON(w, http.StatusOK, discovery.SecurityGroupsResponse{
			Cloud:     cloud,
			Region:    region,
			NetworkID: networkID,
			Groups:    nil,
			Status:    discovery.StatusUnavailable,
			Message:   "Security groups in this app map to AWS EC2; for other targets, configure firewalls, NSGs, or NetworkPolicies in your environment and enter identifiers manually as needed.",
		})
		return
	}
	id := chi.URLParam(r, "id")
	creds, defReg, ok := s.getProfileCreds(w, r, id)
	if !ok {
		return
	}
	reg := region
	if reg == "" {
		reg = defReg
	}
	sgs, err := awsx.ListSecurityGroups(r.Context(), reg, creds.AccessKeyID, creds.SecretAccessKey, networkID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, discovery.SecurityGroupsResponse{
		Cloud:     discovery.CloudAWS,
		Region:    reg,
		NetworkID: networkID,
		Groups:    discovery.FromAWSSecurityGroups(sgs),
		Status:    discovery.StatusOK,
	})
}

func (s *Server) handleDiscoveryComputeImages(w http.ResponseWriter, r *http.Request) {
	region := strings.TrimSpace(r.URL.Query().Get("region"))
	cloud := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("cloud")))
	if cloud == "" {
		cloud = discovery.CloudAWS
	}
	if region == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "region query required"})
		return
	}
	if cloud == discovery.CloudAWS {
		id := chi.URLParam(r, "id")
		creds, defReg, ok := s.getProfileCreds(w, r, id)
		if !ok {
			return
		}
		reg := region
		if reg == "" {
			reg = defReg
		}
		amis, err := awsx.DefaultAMIInfo(r.Context(), reg, creds.AccessKeyID, creds.SecretAccessKey)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, discovery.ComputeImagesResponse{
			Cloud:  discovery.CloudAWS,
			Region: reg,
			Images: discovery.FromAWSAMIs(amis),
			Status: discovery.StatusOK,
		})
		return
	}
	if cloud == discovery.CloudGCP || cloud == discovery.CloudOCI || cloud == discovery.CloudK8s || cloud == discovery.CloudAnsible || cloud == discovery.CloudVMware {
		writeJSON(w, http.StatusOK, discovery.ComputeImagesResponse{
			Cloud:  cloud,
			Region: region,
			Images: nil,
			Status: discovery.StatusUnavailable,
			Message: "Image suggestions are not implemented for this target; set the image or template field from your project or catalog.",
		})
		return
	}
	writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown cloud; use aws, gcp, oci, k8s, ansible, or vmware"})
}
