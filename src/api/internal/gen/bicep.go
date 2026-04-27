package gen

import (
	"context"
	"fmt"
	"strings"
)

// BicepAWSEmitter emits a minimal, valid Bicep file. This wizard is AWS-EC2 centric; Bicep targets Azure, so
// the output is an explicit pointer to other frameworks instead of a misleading Azure VM.
type BicepAWSEmitter struct{}

func (BicepAWSEmitter) Preview(_ context.Context, s WizardState) (map[string]string, error) {
	var b strings.Builder
	regLabel := bicepSingleQuoted(FirstTargetRegion(s))
	extra := ""
	if rs := NormalizedRegions(s); len(rs) > 1 {
		extra = "\n// Multi-region targets (for notes): " + strings.Join(rs, ", ") + "\n"
	}
	bicepQ := regLabel
	fmt.Fprintf(&b, `// iac-builder: Bicep is for **Azure** Resource Manager, while this app generates **AWS** EC2.
// Use Terraform, OpenTofu, CloudFormation, Pulumi, AWS CDK, or Crossplane in the form for the same wizard.
// Azure VM Bicep: start from https://learn.microsoft.com/azure/azure-resource-manager/bicep/
%s
@description('Wizard region (AWS) — for your notes only; not used by a deploy of this file.')
param awsRegionLike string = '%s'

@description('Placeholder output so this file is valid Bicep syntax.')
output tip string = 'No Azure resources generated — choose another IaC target above for AWS.'

`, extra, bicepQ)
	return map[string]string{"main.bicep": b.String()}, nil
}

func bicepSingleQuoted(s string) string { return strings.ReplaceAll(s, "'", "''") }
