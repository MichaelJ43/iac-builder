package store

import (
	"encoding/json"
	"testing"
)

func TestNormalizePresetData_legacyStateOnly(t *testing.T) {
	t.Setenv("IAC_DEFAULT_PRESET_LABELS", "platform, core")
	b, err := NormalizePresetData([]byte(`{"state":{"framework":"terraform","cloud":"aws","region":"us-east-1"}}`))
	if err != nil {
		t.Fatal(err)
	}
	var f PresetFileV1
	if err := json.Unmarshal(b, &f); err != nil {
		t.Fatal(err)
	}
	if f.FormatVersion != 1 {
		t.Fatalf("version %d", f.FormatVersion)
	}
	if len(f.Labels) < 1 {
		t.Fatalf("expected default labels merged: %v", f.Labels)
	}
}

func TestNormalizePresetData_fullEnvelope(t *testing.T) {
	b, err := NormalizePresetData([]byte(
		`{"format_version":1,"labels":["a","B"],"state":{"framework":"terraform","cloud":"aws","region":"us-west-2"}}`))
	if err != nil {
		t.Fatal(err)
	}
	var f PresetFileV1
	if err := json.Unmarshal(b, &f); err != nil {
		t.Fatal(err)
	}
	if len(f.Labels) < 1 {
		t.Fatal("expected labels")
	}
}

func TestParsePresetListMeta(t *testing.T) {
	m, err := ParsePresetListMeta(`{"state":{"framework":""}}`)
	if err != nil {
		t.Fatal(err)
	}
	if m.FormatVersion != 1 {
		t.Fatal(m.FormatVersion)
	}
	m, err = ParsePresetListMeta(`{"format_version":1,"labels":["x"],"state":{}}`)
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Labels) != 1 || m.Labels[0] != "x" {
		t.Fatalf("%v", m.Labels)
	}
}

func TestLabelsListContains(t *testing.T) {
	if !LabelsListContains([]string{"A", "b"}, "a") {
		t.Fatal("case")
	}
	if LabelsListContains([]string{"x"}, "y") {
		t.Fatal("y")
	}
}
