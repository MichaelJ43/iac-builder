package gen

import "context"

// Emitter produces named files (path -> content) for a wizard state.
type Emitter interface {
	Preview(ctx context.Context, s WizardState) (map[string]string, error)
}

// Registry maps wizard framework names to emitters.
type Registry struct {
	terraform       Emitter
	opentofu        Emitter
	cloudformation  Emitter
	pulumi          Emitter
	awsCdk          Emitter
	crossplane      Emitter
	azureBicep      Emitter
}

// NewRegistry wires all built-in emitters (order matches constructor params only; lookup is by framework id).
func NewRegistry(
	terraform, opentofu, cloudformation, pulumi, awsCdk, crossplane, azureBicep Emitter,
) *Registry {
	return &Registry{
		terraform:      terraform,
		opentofu:       opentofu,
		cloudformation: cloudformation,
		pulumi:         pulumi,
		awsCdk:         awsCdk,
		crossplane:     crossplane,
		azureBicep:     azureBicep,
	}
}

func (r *Registry) For(f Framework) (Emitter, bool) {
	switch f {
	case FrameworkTerraform:
		return r.terraform, true
	case FrameworkOpenTofu:
		return r.opentofu, true
	case FrameworkCloudFormation:
		return r.cloudformation, true
	case FrameworkPulumi:
		return r.pulumi, true
	case FrameworkAWSCDK:
		return r.awsCdk, true
	case FrameworkCrossplane:
		return r.crossplane, true
	case FrameworkAzureBicep:
		return r.azureBicep, true
	default:
		return nil, false
	}
}

func Preview(ctx context.Context, reg *Registry, s WizardState) (map[string]string, error) {
	if err := s.Validate(); err != nil {
		return nil, err
	}
	if !IsCloudAWS(s.Cloud) {
		return previewNonAWS(s)
	}
	em, ok := reg.For(s.Framework)
	if !ok {
		return nil, ErrInvalidFramework
	}
	return em.Preview(ctx, s)
}
