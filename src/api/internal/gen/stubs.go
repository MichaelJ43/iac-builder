package gen

import (
	"context"
	"fmt"
)

type stubEmitter struct {
	name   string
	filename string
}

func (e stubEmitter) Preview(_ context.Context, s WizardState) (map[string]string, error) {
	content := fmt.Sprintf("// %s stub — framework selected: %s region=%s\n", e.name, s.Framework, s.Region)
	return map[string]string{e.filename: content}, nil
}

func NewPulumiStub() Emitter {
	return stubEmitter{name: "Pulumi", filename: "index.ts"}
}

func NewBicepStub() Emitter {
	return stubEmitter{name: "Azure Bicep", filename: "main.bicep"}
}

func NewCDKStub() Emitter {
	return stubEmitter{name: "AWS CDK", filename: "app.ts"}
}
