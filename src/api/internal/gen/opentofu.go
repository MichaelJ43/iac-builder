package gen

import (
	"context"
)

// OpenTofuEmitter emits the same HCL as Terraform. OpenTofu is a drop-in for the Terraform language and CLI
// (https://opentofu.org/); the header notes `tofu init` / `tofu apply` instead of `terraform`.
type OpenTofuEmitter struct{}

const openTofuHeader = `# OpenTofu: drop-in for Terraform HCL. Use: tofu init; tofu plan; tofu apply
# https://opentofu.org/

`

func (OpenTofuEmitter) Preview(ctx context.Context, s WizardState) (map[string]string, error) {
	files, err := (TerraformEmitter{}).Preview(ctx, s)
	if err != nil {
		return nil, err
	}
	files["main.tf"] = openTofuHeader + files["main.tf"]
	return files, nil
}
