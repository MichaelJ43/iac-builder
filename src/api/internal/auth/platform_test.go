package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPlatform_UserID_sub(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/auth/me" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_, _ = w.Write([]byte(`{"sub":"u_test_1"}`))
	}))
	defer srv.Close()
	p := &Platform{cfg: Config{APIBase: srv.URL, MePath: "/v1/auth/me", UserKeys: []string{"sub"}}}

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	uid, err := p.UserID(r)
	if err != nil {
		t.Fatal(err)
	}
	if uid != "u_test_1" {
		t.Fatalf("uid %q", uid)
	}
}

func TestPlatform_Unauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()
	p := &Platform{cfg: Config{APIBase: srv.URL, MePath: "/v1/auth/me", UserKeys: []string{"sub"}}}

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	_, err := p.UserID(r)
	if err != ErrUnauthorized {
		t.Fatalf("got %v", err)
	}
}
