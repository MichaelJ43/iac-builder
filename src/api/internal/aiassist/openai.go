package aiassist

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// OpenAI chat completions (BYOK: caller passes the user's API key; no operator key).
func OpenAIsuggestions(ctx context.Context, apiKey, userContextJSON string) (suggestions string, err error) {
	base := strings.TrimSpace(os.Getenv("IAC_OPENAI_BASE_URL"))
	if base == "" {
		base = "https://api.openai.com"
	}
	base = strings.TrimRight(base, "/")
	model := strings.TrimSpace(os.Getenv("IAC_OPENAI_MODEL"))
	if model == "" {
		model = "gpt-4o-mini"
	}
	sys := "You are a security-aware assistant for an AWS EC2 / IaC builder. The user will send a JSON " +
		"wizard context. Reply with concise bullet suggestions: networking, hardening, and operational " +
		"notes only. Do not output credentials, access keys, or long Terraform blocks. Keep under 800 words."
	user := "Wizard context (JSON):\n" + userContextJSON

	body, err := json.Marshal(map[string]any{
		"model":       model,
		"temperature": 0.2,
		"max_tokens":  1024,
		"messages": []map[string]string{
			{"role": "system", "content": sys},
			{"role": "user", "content": user},
		},
	})
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", openAIHTTPError(resp.StatusCode, b)
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", err
	}
	if len(out.Choices) < 1 {
		return "", errors.New("empty model response")
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

func openAIHTTPError(code int, body []byte) error {
	if code == http.StatusUnauthorized {
		return errors.New("openai API rejected the key (401); save a valid key or remove it and try again")
	}
	if code == http.StatusTooManyRequests {
		return errors.New("openai rate limit; try again shortly")
	}
	var j struct {
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &j); err == nil && j.Error != nil && j.Error.Message != "" {
		return fmt.Errorf("openai: %s", j.Error.Message)
	}
	return fmt.Errorf("openai HTTP %d", code)
}
