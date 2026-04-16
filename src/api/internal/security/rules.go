package security

import "github.com/MichaelJ43/iac-builder/api/internal/gen"

// Recommendation is a user-facing security hint.
type Recommendation struct {
	ID       string `json:"id"`
	Severity string `json:"severity"` // info | warning | error
	Message  string `json:"message"`
}

func Evaluate(s gen.WizardState) []Recommendation {
	var out []Recommendation
	if s.SSHCIDR == "0.0.0.0/0" || s.SSHCIDR == "::/0" {
		out = append(out, Recommendation{
			ID:       "ssh-open-world",
			Severity: "warning",
			Message:  "Avoid SSH from 0.0.0.0/0; prefer a specific /32 or use SSM Session Manager.",
		})
	}
	if !s.IMDSv2Required {
		out = append(out, Recommendation{
			ID:       "imdsv2",
			Severity: "info",
			Message:  "Enable IMDSv2 (http_tokens=required) to reduce SSRF risk against instance metadata.",
		})
	}
	if !s.EnableEbsEncryption {
		out = append(out, Recommendation{
			ID:       "ebs-encrypt",
			Severity: "info",
			Message:  "Enable root EBS encryption at rest for compliance and data protection.",
		})
	}
	out = append(out, Recommendation{
		ID:       "least-privilege-iam",
		Severity: "info",
		Message:  "Attach a least-privilege instance profile; avoid AdministratorAccess for workloads.",
	})
	return out
}
