package aiassist

import "testing"

func TestGetPromptDisclosure_openaiOnly(t *testing.T) {
	d := GetPromptDisclosure()
	if d.Provider != "openai" {
		t.Fatalf("provider %q", d.Provider)
	}
	if d.SystemPrompt == "" {
		t.Fatal("empty system")
	}
	if d.UserMessagePrefix != UserMessagePrefix {
		t.Fatalf("prefix mismatch")
	}
	if len(d.FutureProviders) != 0 {
		t.Fatalf("expected no future providers yet, got %v", d.FutureProviders)
	}
}
