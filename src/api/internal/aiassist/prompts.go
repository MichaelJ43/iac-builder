package aiassist

// UserMessagePrefix is prepended to the v1 context JSON in the user role message.
const UserMessagePrefix = "Wizard context (JSON):\n"

// Prompting is **OpenAI Chat Completions** today; additional providers can mirror the same
// user-context contract later (see README “Optional LLM assistance”).

// SystemPrompt is the system message sent to the model for suggestion requests.
func SystemPrompt() string {
	return "You are a security-aware assistant for an AWS EC2 / IaC builder. The user will send a JSON " +
		"wizard context. Reply with concise bullet suggestions: networking, hardening, and operational " +
		"notes only. Do not output credentials, access keys, or long Terraform blocks. Keep under 800 words."
}

// UserMessageForContext builds the user role message; it is the only place the wizard JSON is embedded.
func UserMessageForContext(wizardContextJSON string) string {
	return UserMessagePrefix + wizardContextJSON
}

// PromptDisclosure is returned by GET /api/v1/ai/prompt-disclosure (no secrets).
type PromptDisclosure struct {
	Provider          string   `json:"provider"`           // e.g. "openai"
	FutureProviders   []string `json:"future_providers"`   // empty today; reserved for other backends
	SystemPrompt      string   `json:"system_prompt"`
	UserMessagePrefix string   `json:"user_message_prefix"`
	UserMessageIntro  string   `json:"user_message_intro"`
	Parameters        string   `json:"parameters"`         // temperature, max_tokens, model env
	ReviewURL         string   `json:"source_code_path_hint"`
}

// GetPromptDisclosure materializes the same strings the server uses in OpenAIsuggestions.
func GetPromptDisclosure() PromptDisclosure {
	return PromptDisclosure{
		Provider:         "openai",
		FutureProviders:  []string{},
		SystemPrompt:     SystemPrompt(),
		UserMessagePrefix: UserMessagePrefix,
		UserMessageIntro:  "The user message is one string: user_message_prefix plus the v1 context JSON (same as the “Context preview” in the UI).",
		Parameters:        "Model: IAC_OPENAI_MODEL (default gpt-4o-mini), temperature 0.2, max_tokens 1024, base IAC_OPENAI_BASE_URL (default https://api.openai.com).",
		ReviewURL:         "api/internal/aiassist (prompts.go, openai.go) in the repository",
	}
}
