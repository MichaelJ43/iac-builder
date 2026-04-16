package component

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/MichaelJ43/iac-builder/api/export"
)

const testMasterKeyHex = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

func TestHealthz(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	res, err := http.Get(s.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
}

func TestPreview_Terraform(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":       "terraform",
			"cloud":           "aws",
			"region":          "us-east-1",
			"vpc_id":          "vpc-1",
			"subnet_id":       "subnet-1",
			"instance_type":   "t3.micro",
			"ami":             "ami-12345",
			"security_group_ids": []string{"sg-1"},
		},
	}
	b, _ := json.Marshal(body)
	res, err := http.Post(s.URL+"/api/v1/preview", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		Files map[string]string `json:"files"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.Files["main.tf"] == "" {
		t.Fatal("expected main.tf")
	}
}

func mustDecodeHex(s string) []byte {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return b
}
