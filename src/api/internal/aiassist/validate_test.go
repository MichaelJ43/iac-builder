package aiassist

import (
	"encoding/json"
	"testing"
)

func goodCtx() []byte {
	m := map[string]any{
		"v":   1,
		"app": "iac-builder",
		"wizard": map[string]any{
			"framework": "terraform",
			"cloud":     "aws",
			"region":    "us-east-1",
		},
		"stateSummaryLabel": "x",
	}
	b, _ := json.Marshal(m)
	return b
}

func TestValidateContextV1_ok(t *testing.T) {
	if err := ValidateContextV1(goodCtx()); err != nil {
		t.Fatal(err)
	}
}

func TestValidateContextV1_badV(t *testing.T) {
	if err := ValidateContextV1([]byte(`{"v":3,"app":"iac-builder","wizard":{}}`)); err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateContextV1_v2_ok(t *testing.T) {
	b, _ := json.Marshal(map[string]any{
		"v":   2,
		"app": "iac-builder",
		"wizard": map[string]any{
			"framework": "terraform",
			"cloud":     "aws",
			"region":    "us-east-1",
			"regions":   []string{"us-east-1"},
		},
		"stateSummaryLabel": "x",
	})
	if err := ValidateContextV1(b); err != nil {
		t.Fatal(err)
	}
}

func TestValidateContextV1_noWizard(t *testing.T) {
	b, _ := json.Marshal(map[string]any{"v": 1, "app": "iac-builder"})
	if err := ValidateContextV1(b); err == nil {
		t.Fatal("expected error")
	}
}
