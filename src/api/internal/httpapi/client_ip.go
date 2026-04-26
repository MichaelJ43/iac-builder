package httpapi

import (
	"net"
	"net/http"
	"strings"
)

// clientIPKey returns a string suitable for per-client rate limits.
// Prefer the first X-Forwarded-For hop when present; otherwise the host
// part of RemoteAddr.
func clientIPKey(r *http.Request) string {
	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}
