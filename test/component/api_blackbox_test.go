package component

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/MichaelJ43/iac-builder/api/export"
)

const testMasterKeyHex = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

func TestAuthStatus(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	res, err := http.Get(s.URL + "/api/v1/auth/status")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		Auth string `json:"auth"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.Auth != "disabled" {
		t.Fatalf("auth %q", out.Auth)
	}
}

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

func TestPreview_CloudFormation(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":          "cloudformation",
			"cloud":              "aws",
			"region":             "us-east-1",
			"vpc_id":             "vpc-1",
			"subnet_id":          "subnet-1",
			"instance_type":      "t3.micro",
			"ami":                "ami-12345",
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
	if out.Files["template.yaml"] == "" {
		t.Fatal("expected template.yaml")
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
			"framework":          "terraform",
			"cloud":              "aws",
			"region":             "us-east-1",
			"vpc_id":             "vpc-1",
			"subnet_id":          "subnet-1",
			"instance_type":      "t3.micro",
			"ami":                "ami-12345",
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

func TestSecurityRecommendations(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":             "terraform",
			"cloud":                 "aws",
			"region":                "us-east-1",
			"subnet_id":             "subnet-1",
			"instance_type":         "t3.micro",
			"ami":                   "ami-12345",
			"ssh_cidr":              "0.0.0.0/0",
			"security_group_ids":    []string{"sg-1"},
			"imdsv2_required":       true,
			"enable_ebs_encryption": true,
		},
	}
	b, _ := json.Marshal(body)
	res, err := http.Post(s.URL+"/api/v1/security/recommendations", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		Recommendations []struct {
			ID          string   `json:"id"`
			Severity    string   `json:"severity"`
			Message     string   `json:"message"`
			Remediation string   `json:"remediation"`
			Tags        []string `json:"tags"`
		} `json:"recommendations"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if len(out.Recommendations) == 0 {
		t.Fatal("expected recommendations")
	}
	var ssh *struct {
		ID          string   `json:"id"`
		Severity    string   `json:"severity"`
		Message     string   `json:"message"`
		Remediation string   `json:"remediation"`
		Tags        []string `json:"tags"`
	}
	for i := range out.Recommendations {
		if out.Recommendations[i].ID == "ssh-open-world" {
			ssh = &out.Recommendations[i]
			break
		}
	}
	if ssh == nil {
		t.Fatal("expected ssh-open-world")
	}
	if ssh.Remediation == "" {
		t.Fatal("expected remediation on ssh-open-world")
	}
	var iamRemediation string
	for i := range out.Recommendations {
		if out.Recommendations[i].ID == "least-privilege-iam" {
			iamRemediation = out.Recommendations[i].Remediation
			break
		}
	}
	if iamRemediation == "" || !strings.Contains(iamRemediation, "Version") {
		t.Fatal("expected IAM starter in least-privilege remediation")
	}
	var secRem string
	for i := range out.Recommendations {
		if out.Recommendations[i].ID == "secrets-manager-app-runtime" {
			secRem = out.Recommendations[i].Remediation
			break
		}
	}
	if secRem == "" || !strings.Contains(secRem, "Terraform") {
		t.Fatal("expected Terraform guidance in secrets-manager-app-runtime remediation")
	}
	var privateEgressRem string
	for i := range out.Recommendations {
		if out.Recommendations[i].ID == "private-egress-endpoints" {
			privateEgressRem = out.Recommendations[i].Remediation
			break
		}
	}
	if privateEgressRem == "" || !strings.Contains(privateEgressRem, "aws_vpc_endpoint") {
		t.Fatal("expected aws_vpc_endpoint in private-egress-endpoints remediation (no public IP in payload)")
	}
}

func TestAIAssist_Stub(t *testing.T) {
	t.Setenv("IAC_AI_ASSIST_RPM", "5")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	body := map[string]any{
		"context": map[string]any{
			"v":                 1,
			"app":               "iac-builder",
			"stateSummaryLabel": "test",
			"wizard": map[string]any{
				"framework": "terraform", "cloud": "aws", "region": "us-east-1",
			},
		},
	}
	b, _ := json.Marshal(body)
	res, err := http.Post(s.URL+"/api/v1/ai/assist", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		OK          bool   `json:"ok"`
		Mode        string `json:"mode"`
		Message     string `json:"message"`
		Suggestions string `json:"suggestions"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if !out.OK || out.Mode != "stub" {
		t.Fatalf("response %+v", out)
	}
	if out.Message == "" {
		t.Fatal("expected message")
	}
}

func TestAIAssist_BadContext(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	b, _ := json.Marshal(map[string]any{
		"context": map[string]any{"v": 2, "app": "other", "wizard": map[string]any{}},
	})
	res, err := http.Post(s.URL+"/api/v1/ai/assist", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d", res.StatusCode)
	}
}

func TestAIAssist_RateLimit(t *testing.T) {
	t.Setenv("IAC_AI_ASSIST_RPM", "2")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	good := map[string]any{
		"context": map[string]any{
			"v": 1, "app": "iac-builder", "stateSummaryLabel": "x", "wizard": map[string]any{"framework": "terraform"},
		},
	}
	b, _ := json.Marshal(good)
	for i := 0; i < 2; i++ {
		res, err := http.Post(s.URL+"/api/v1/ai/assist", "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			t.Fatalf("i=%d status %d", i, res.StatusCode)
		}
	}
	res, err := http.Post(s.URL+"/api/v1/ai/assist", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", res.StatusCode)
	}
}
