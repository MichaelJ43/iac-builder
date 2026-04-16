package gen

import "context"

// Emitter produces named files (path -> content) for a wizard state.
type Emitter interface {
	Preview(ctx context.Context, s WizardState) (map[string]string, error)
}

type Registry struct {
	terraform      Emitter
	cloudformation Emitter
	pulumi         Emitter
	bicep          Emitter
	cdk            Emitter
}

func NewRegistry(tf, cfn, pulumi, bicep, cdk Emitter) *Registry {
	return &Registry{terraform: tf, cloudformation: cfn, pulumi: pulumi, bicep: bicep, cdk: cdk}
}

func (r *Registry) For(f Framework) (Emitter, bool) {
	switch f {
	case FrameworkTerraform:
		return r.terraform, true
	case FrameworkCloudFormation:
		return r.cloudformation, true
	case FrameworkPulumi:
		return r.pulumi, true
	case FrameworkAzureBicep:
		return r.bicep, true
	case FrameworkAWSCDK:
		return r.cdk, true
	default:
		return nil, false
	}
}

func Preview(ctx context.Context, reg *Registry, s WizardState) (map[string]string, error) {
	if err := s.Validate(); err != nil {
		return nil, err
	}
	em, ok := reg.For(s.Framework)
	if !ok {
		return nil, ErrInvalidFramework
	}
	return em.Preview(ctx, s)
}
