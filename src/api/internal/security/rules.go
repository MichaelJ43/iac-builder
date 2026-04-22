package security

import (
	"net"
	"strings"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
)

// Recommendation is a user-facing security hint.
type Recommendation struct {
	ID          string   `json:"id"`
	Severity    string   `json:"severity"` // info | warning | error
	Message     string   `json:"message"`
	Remediation string   `json:"remediation,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

func sshCIDROpenWorld(cidr string) bool {
	c := strings.TrimSpace(cidr)
	return c == "0.0.0.0/0" || c == "::/0"
}

// sshCIDRBroad returns true for IPv4 prefixes wider than /24 or IPv6 wider than /64 (excluding world-open).
func sshCIDRBroad(cidr string) bool {
	c := strings.TrimSpace(cidr)
	if c == "" || sshCIDROpenWorld(c) {
		return false
	}
	ip, n, err := net.ParseCIDR(c)
	if err != nil {
		return false
	}
	if ip.To4() != nil {
		ones, _ := n.Mask.Size()
		return ones < 24
	}
	ones, _ := n.Mask.Size()
	return ones < 64
}

func wizardLooksReadyForCompute(s gen.WizardState) bool {
	return strings.TrimSpace(s.SubnetID) != "" &&
		strings.TrimSpace(s.InstanceType) != "" &&
		strings.TrimSpace(s.AMI) != ""
}

// starterInstanceRolePolicy is illustrative JSON for a minimal instance role (SSM + read-only example).
const starterInstanceRolePolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMManagedInstanceCore",
      "Effect": "Allow",
      "Action": [
        "ssm:UpdateInstanceInformation",
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ExampleReadOnlyBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::YOUR_BUCKET", "arn:aws:s3:::YOUR_BUCKET/*"]
    }
  ]
}`

func Evaluate(s gen.WizardState) []Recommendation {
	var out []Recommendation

	if sshCIDROpenWorld(s.SSHCIDR) {
		out = append(out, Recommendation{
			ID:          "ssh-open-world",
			Severity:    "warning",
			Message:     "Avoid SSH from 0.0.0.0/0 or ::/0; prefer a specific /32 or use SSM Session Manager.",
			Remediation: "Restrict security group ingress to your IP, or remove SSH entirely and use AWS Systems Manager Session Manager with the AmazonSSMManagedInstanceCore managed policy.",
			Tags:        []string{"cis", "network"},
		})
	} else if sshCIDRBroad(s.SSHCIDR) {
		out = append(out, Recommendation{
			ID:          "ssh-broad-cidr",
			Severity:    "warning",
			Message:     "SSH source CIDR is broader than a typical /24 (IPv4) or /64 (IPv6); attackers can reach more addresses than needed.",
			Remediation: "Tighten ssh_cidr to the smallest range that still includes your operators (often a /32).",
			Tags:        []string{"cis", "network"},
		})
	}

	if s.AssociatePublicIP && strings.TrimSpace(s.SSHCIDR) == "" {
		out = append(out, Recommendation{
			ID:          "ssh-cidr-unset-public",
			Severity:    "warning",
			Message:     "Public IP is enabled but SSH CIDR is empty; ensure security groups do not expose port 22 to the world.",
			Remediation: "Set ssh_cidr for documentation and review matching security group rules, or disable Associate public IP and use private connectivity + SSM.",
			Tags:        []string{"cis", "network"},
		})
	}

	if !s.IMDSv2Required {
		out = append(out, Recommendation{
			ID:          "imdsv2",
			Severity:    "info",
			Message:     "Enable IMDSv2 (http_tokens=required) to reduce SSRF risk against instance metadata.",
			Remediation: "Set imdsv2_required in the wizard; Terraform emitter maps this to metadata_options.http_tokens = \"required\".",
			Tags:        []string{"cis", "metadata"},
		})
	}

	if !s.EnableEbsEncryption {
		out = append(out, Recommendation{
			ID:          "ebs-encrypt",
			Severity:    "info",
			Message:     "Enable root EBS encryption at rest for compliance and data protection.",
			Remediation: "Enable Encrypt root EBS in the wizard so generated IaC requests encrypted volumes.",
			Tags:        []string{"cis", "storage"},
		})
	}

	if wizardLooksReadyForCompute(s) && len(s.SecurityGroupIDs) == 0 {
		out = append(out, Recommendation{
			ID:          "missing-security-groups",
			Severity:    "warning",
			Message:     "No security groups attached in the wizard; production instances should use explicit groups with least-privilege rules.",
			Remediation: "Add security_group_ids and ensure each group allows only required ports and sources (no 0.0.0.0/0 on administrative ports).",
			Tags:        []string{"cis", "network"},
		})
	}

	if strings.TrimSpace(s.KeyName) != "" {
		out = append(out, Recommendation{
			ID:          "ec2-keypair-long-lived",
			Severity:    "info",
			Message:     "EC2 key pairs are long-lived material on disk; prefer SSM Session Manager or EC2 Instance Connect for interactive access.",
			Remediation: "Remove key_name for SSM-only access, or rotate keys regularly and store secrets in AWS Secrets Manager / SSM Parameter Store (SecureString).",
			Tags:        []string{"secrets", "access"},
		})
	}

	// P2: explicit guidance for application-layer secrets (distinct from EC2 key pairs / SSH).
	if wizardLooksReadyForCompute(s) {
		out = append(out, Recommendation{
			ID:          "secrets-manager-app-runtime",
			Severity:    "info",
			Message:     "Do not embed application secrets (API keys, database passwords, tokens) in user data, shell scripts, or static files in the image. Load them at runtime from AWS Secrets Manager or SSM Parameter Store (SecureString) with IAM scoped to specific resource ARNs.",
			Remediation: "Grant the instance role only secretsmanager:GetSecretValue (and kms:Decrypt for CMK-backed secrets) on required secret ARNs, or use SSM Parameter Store with ssm:GetParameters* as appropriate. In Terraform, reference secrets via data sources or dynamic references—never check secret values into VCS.",
			Tags:        []string{"secrets", "secrets-manager", "cis", "compliance"},
		})
	}

	// P2: no public IP => no direct internet; plan NAT and/or interface endpoints for AWS APIs (SSM, etc.).
	if wizardLooksReadyForCompute(s) && !s.AssociatePublicIP {
		out = append(out, Recommendation{
			ID:          "private-egress-endpoints",
			Severity:    "info",
			Message:     "No public IP: the instance cannot reach the internet or AWS service endpoints directly. Plan outbound routing (e.g. NAT gateway in the route table) and/or VPC interface endpoints for the APIs you need (commonly SSM, EC2 Messages, and S3) so updates and SSM work.",
			Remediation: "Add a 0.0.0.0/0 (or ::/0) default route in the private route table to a NAT gateway, and/or add interface endpoints (com.amazonaws.REGION.ssm, ssmmessages, ec2messages, and a gateway or interface endpoint for S3 as required). In Terraform, model aws_vpc_endpoint and route tables explicitly—do not assume a public IP for patching or SSM.",
			Tags:        []string{"network", "ssm", "vpc", "cis"},
		})
	}

	out = append(out, Recommendation{
		ID:          "least-privilege-iam",
		Severity:    "info",
		Message:     "Attach a least-privilege instance profile; avoid AdministratorAccess for workloads.",
		Remediation: "Start from AWS managed policy AmazonSSMManagedInstanceCore for Session Manager, then add narrow statements for each AWS API your app needs. Example skeleton (replace ARNs):\n" + starterInstanceRolePolicy,
		Tags:        []string{"iam", "cis"},
	})

	return out
}
