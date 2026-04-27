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

func TestPreview_OpenTofu(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":          "opentofu",
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
	tf := out.Files["main.tf"]
	if tf == "" || !strings.HasPrefix(tf, "# OpenTofu:") {
		t.Fatal("expected OpenTofu header on main.tf")
	}
}

func TestPreview_Crossplane(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":          "crossplane",
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
	if out.Files["ec2-instance.yaml"] == "" {
		t.Fatal("expected ec2-instance.yaml")
	}
}

func TestPreview_Pulumi(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":          "pulumi",
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
	if out.Files["index.ts"] == "" {
		t.Fatal("expected index.ts")
	}
}

func TestPreview_GCP_Terraform(t *testing.T) {
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
			"cloud":              "gcp",
			"region":             "us-central1",
			"vpc_id":             "",
			"subnet_id":          "projects/p/regions/us-central1/subnetworks/default",
			"instance_type":      "e2-medium",
			"ami":                "debian-12",
			"security_group_ids": []string{},
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
	if !strings.Contains(out.Files["main.tf"], "google_compute_instance") {
		t.Fatal("expected GCP starter in main.tf")
	}
}

func TestPreview_Blocked_SSH_OperatorGuard(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	srv := httptest.NewServer(h)
	defer srv.Close()

	body := map[string]any{
		"state": map[string]any{
			"framework":             "terraform",
			"cloud":                 "aws",
			"region":                 "us-east-1",
			"subnet_id":              "subnet-1",
			"instance_type":         "t3.micro",
			"ami":                   "ami-12345",
			"ssh_cidr":              "0.0.0.0/0",
			"security_group_ids":    []string{"sg-1"},
			"imdsv2_required":       true,
			"enable_ebs_encryption": true,
		},
	}
	b, _ := json.Marshal(body)
	res, err := http.Post(srv.URL+"/api/v1/preview", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d want 400", res.StatusCode)
	}
	var out struct {
		Error string `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.Error == "" || !strings.Contains(out.Error, "operator policy") {
		t.Fatalf("error: %q", out.Error)
	}
}

func TestGet_OperatorGuards(t *testing.T) {
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "1")
	t.Setenv("IAC_REQUIRE_IMDSV2", "true")
	t.Setenv("IAC_REQUIRE_EBS_ENCRYPTION", "")
	t.Setenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP", "")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	srv := httptest.NewServer(h)
	defer srv.Close()
	res, err := http.Get(srv.URL + "/api/v1/operator/guards")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		BlockSshOpenWorld  bool `json:"block_ssh_open_world"`
		RequireImdsv2      bool `json:"require_imdsv2"`
		AnyEnabled         bool `json:"any_enabled"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if !out.BlockSshOpenWorld || !out.RequireImdsv2 || !out.AnyEnabled {
		t.Fatalf("unexpected %+v", out)
	}
}

func TestPreview_Blocked_RequireImds2_OperatorGuard(t *testing.T) {
	t.Setenv("IAC_REQUIRE_IMDSV2", "1")
	t.Setenv("IAC_BLOCK_SSH_OPEN_WORLD", "")
	t.Setenv("IAC_REQUIRE_EBS_ENCRYPTION", "")
	t.Setenv("IAC_BLOCK_ASSOCIATE_PUBLIC_IP", "")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	srv := httptest.NewServer(h)
	defer srv.Close()
	body := map[string]any{
		"state": map[string]any{
			"framework":             "terraform",
			"cloud":                 "aws",
			"region":                 "us-east-1",
			"subnet_id":              "subnet-1",
			"instance_type":         "t3.micro",
			"ami":                   "ami-12345",
			"imdsv2_required":       false,
			"security_group_ids":    []string{"sg-1"},
			"enable_ebs_encryption": true,
		},
	}
	b, _ := json.Marshal(body)
	res, err := http.Post(srv.URL+"/api/v1/preview", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("status %d want 400", res.StatusCode)
	}
	var o struct{ Error string `json:"error"` }
	if err := json.NewDecoder(res.Body).Decode(&o); err != nil {
		t.Fatal(err)
	}
	if o.Error == "" || !strings.Contains(o.Error, "IMDSv2") {
		t.Fatalf("error: %q", o.Error)
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

func TestAIPromptDisclosure(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	res, err := http.Get(s.URL + "/api/v1/ai/prompt-disclosure")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var out struct {
		Provider string   `json:"provider"`
		Future   []string `json:"future_providers"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.Provider != "openai" {
		t.Fatalf("provider %q", out.Provider)
	}
	if out.Future == nil {
		t.Fatal("expected future_providers array")
	}
}

func TestOpenAIKey_PUT_GET_DELETE(t *testing.T) {
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	s := httptest.NewServer(h)
	defer s.Close()
	putBody := `{"openai_api_key":"sk-abcdefghijklmnopqrstuv"}`
	pr, _ := http.NewRequest(http.MethodPut, s.URL+"/api/v1/ai/openai-key", bytes.NewBufferString(putBody))
	pr.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(pr)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("put status %d", res.StatusCode)
	}
	res, err = http.Get(s.URL + "/api/v1/ai/openai-key")
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("get status %d", res.StatusCode)
	}
	var g struct {
		Configured bool   `json:"configured"`
		KeyLast4   string `json:"key_last4"`
	}
	_ = json.NewDecoder(res.Body).Decode(&g)
	_ = res.Body.Close()
	if !g.Configured || g.KeyLast4 != "stuv" {
		t.Fatalf("get body %+v", g)
	}
	del, _ := http.NewRequest(http.MethodDelete, s.URL+"/api/v1/ai/openai-key", nil)
	res, err = http.DefaultClient.Do(del)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status %d", res.StatusCode)
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

func TestPresets_CreateV1_AndListFilter(t *testing.T) {
	t.Setenv("IAC_DEFAULT_PRESET_LABELS", "platform, shared")
	h, cleanup, err := export.NewTestHandler("file::memory:?cache=shared", mustDecodeHex(testMasterKeyHex))
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	srv := httptest.NewServer(h)
	defer srv.Close()

	st := map[string]any{
		"framework": "terraform", "cloud": "aws", "region": "us-east-1",
		"subnet_id": "subnet-1", "instance_type": "t3.micro", "ami": "ami-1", "key_name": "",
		"security_group_ids": []string{"sg-1"}, "associate_public_ip": false,
		"imdsv2_required": true, "enable_ebs_encryption": true, "ssh_cidr": "",
		"app_secretsmanager_secret_name": "", "app_ssm_parameter_name": "",
	}
	createBody, _ := json.Marshal(map[string]any{
		"name": "p1",
		"data": map[string]any{
			"format_version": 1,
			"labels":         []string{"team-a"},
			"state":          st,
		},
	})
	res, err := http.Post(srv.URL+"/api/v1/presets", "application/json", bytes.NewReader(createBody))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create: %d", res.StatusCode)
	}

	res, err = http.Get(srv.URL + "/api/v1/presets")
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list: %d", res.StatusCode)
	}
	var listOut struct {
		Presets []struct {
			Name   string   `json:"name"`
			Labels []string `json:"labels"`
		} `json:"presets"`
	}
	if err := json.NewDecoder(res.Body).Decode(&listOut); err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if len(listOut.Presets) != 1 {
		t.Fatalf("presets: %+v", listOut)
	}
	if !containsStr(listOut.Presets[0].Labels, "platform") {
		t.Fatalf("expected default label merged: %v", listOut.Presets[0].Labels)
	}
	if !containsStr(listOut.Presets[0].Labels, "team-a") {
		t.Fatalf("expected user label: %v", listOut.Presets[0].Labels)
	}

	res, err = http.Get(srv.URL + "/api/v1/presets?label=nonexistent-xyz")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(&listOut); err != nil {
		t.Fatal(err)
	}
	if len(listOut.Presets) != 0 {
		t.Fatalf("filter: %+v", listOut.Presets)
	}
}

func containsStr(s []string, want string) bool {
	for _, x := range s {
		if x == want {
			return true
		}
	}
	return false
}
