package store

import (
	"encoding/json"
	"errors"
	"os"
	"sort"
	"strings"
)

const presetFormatV1 = 1

// PresetFileV1 is the JSON stored in wizard_presets.json_data (v1+).
type PresetFileV1 struct {
	FormatVersion int             `json:"format_version"`
	Labels        []string        `json:"labels"`
	State         json.RawMessage `json:"state"`
}

// NormalizePresetData validates POST body and returns canonical v1 json_data bytes.
// Accepts { "state": { ... } } (legacy) or the full { "format_version", "labels", "state" }.
func NormalizePresetData(input []byte) ([]byte, error) {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(input, &top); err != nil {
		return nil, err
	}
	st, ok := top["state"]
	if !ok {
		return nil, errors.New("data.state is required")
	}
	fv := presetFormatV1
	if v, ok := top["format_version"]; ok {
		if err := json.Unmarshal(v, &fv); err != nil {
			return nil, err
		}
		if fv < 1 {
			fv = 1
		}
	}
	var userLabels []string
	if v, ok := top["labels"]; ok {
		if err := json.Unmarshal(v, &userLabels); err != nil {
			return nil, err
		}
	}
	labels := mergePresetLabels(LabelsFromEnv(), userLabels)
	out := PresetFileV1{FormatVersion: fv, Labels: labels, State: st}
	return json.Marshal(out)
}

// LabelsFromEnv reads IAC_DEFAULT_PRESET_LABELS (comma-separated) for use as default org/team library tags.
func LabelsFromEnv() []string {
	return splitCSV(os.Getenv("IAC_DEFAULT_PRESET_LABELS"))
}

func mergePresetLabels(defaults, fromUser []string) []string {
	seen := make(map[string]struct{})
	for _, s := range defaults {
		s = normLabel(s)
		if s == "" {
			continue
		}
		seen[s] = struct{}{}
	}
	for _, s := range fromUser {
		s = normLabel(s)
		if s == "" {
			continue
		}
		seen[s] = struct{}{}
	}
	if len(seen) == 0 {
		return nil
	}
	var out []string
	for s := range seen {
		out = append(out, s)
	}
	sort.Strings(out)
	return out
}

func normLabel(s string) string { return strings.TrimSpace(strings.ToLower(s)) }

func splitCSV(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var out []string
	for _, p := range parts {
		if t := normLabel(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// PresetListMeta is lightweight JSON read from a stored row for /presets (list).
type PresetListMeta struct {
	FormatVersion int      `json:"format_version"`
	Labels        []string `json:"labels"`
}

// ParsePresetListMeta returns metadata for list without unmarshaling the full state.
// Supports v1 { format_version, labels, state } and legacy { state } only.
func ParsePresetListMeta(jsonData string) (PresetListMeta, error) {
	var m map[string]json.RawMessage
	if err := json.Unmarshal([]byte(jsonData), &m); err != nil {
		return PresetListMeta{}, err
	}
	_, hasState := m["state"]
	if !hasState {
		return PresetListMeta{FormatVersion: presetFormatV1, Labels: nil}, nil
	}
	fv := presetFormatV1
	if v, ok := m["format_version"]; ok {
		_ = json.Unmarshal(v, &fv)
		if fv < 1 {
			fv = 1
		}
	}
	var labels []string
	if v, ok := m["labels"]; ok {
		_ = json.Unmarshal(v, &labels)
	}
	for i := range labels {
		labels[i] = normLabel(labels[i])
	}
	if len(labels) > 0 {
		sort.Strings(labels)
		labels = dedupeSorted(labels)
	}
	return PresetListMeta{FormatVersion: fv, Labels: labels}, nil
}

func dedupeSorted(in []string) []string {
	if len(in) < 2 {
		return in
	}
	var out []string
	var prev string
	for _, s := range in {
		if s == "" {
			continue
		}
		if len(out) == 0 || s != prev {
			out = append(out, s)
		}
		prev = s
	}
	return out
}

// LabelsListContains reports whether hay contains needle (case-insensitive after norm).
func LabelsListContains(hay []string, needle string) bool {
	n := normLabel(needle)
	if n == "" {
		return true
	}
	for _, h := range hay {
		if normLabel(h) == n {
			return true
		}
	}
	return false
}
