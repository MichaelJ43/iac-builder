package httpapi

import (
	"net/http"
	"os"
	"strings"
)

func (s *Server) corsHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origins := s.parseAllowedOrigins()
		reqO := r.Header.Get("Origin")
		allowO := s.pickOriginAllow(origins, reqO)
		if allowO != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowO)
			if allowO != "*" {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-IAC-Telemetry-Consent")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) parseAllowedOrigins() []string {
	if v := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS")); v != "" {
		var o []string
		for _, p := range strings.Split(v, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				o = append(o, p)
			}
		}
		return o
	}
	if v := strings.TrimSpace(os.Getenv("CORS_ORIGIN")); v != "" {
		return []string{v}
	}
	// default
	return []string{"*"}
}

// pickOriginAllow echoes the request Origin if it is in the allow list; otherwise the first
// list entry, or * for open dev.
func (s *Server) pickOriginAllow(origins []string, requestOrigin string) string {
	if len(origins) == 0 {
		return "*"
	}
	// open dev / tests
	if len(origins) == 1 && origins[0] == "*" {
		return "*"
	}
	for _, o := range origins {
		if o == requestOrigin {
			return o
		}
	}
	if requestOrigin == "" {
		// same-origin or non-browser
		if len(origins) > 0 {
			return origins[0]
		}
	}
	return ""
}
