// Package export exposes test helpers for black-box tests in ../../test/component.
package export

import (
	"net/http"
	"os"

	"github.com/MichaelJ43/iac-builder/api/internal/gen"
	"github.com/MichaelJ43/iac-builder/api/internal/httpapi"
	"github.com/MichaelJ43/iac-builder/api/internal/store"
)

// NewTestHandler returns an HTTP handler with an isolated SQLite DB and fixed version.
func NewTestHandler(sqliteDSN string, masterKey []byte) (http.Handler, func(), error) {
	st, err := store.OpenSQLite(sqliteDSN, masterKey)
	if err != nil {
		return nil, nil, err
	}
	cleanup := func() { _ = st.Close() }
	reg := gen.NewRegistry(
		gen.TerraformEmitter{},
		gen.OpenTofuEmitter{},
		gen.CloudFormationEmitter{},
		gen.PulumiAWSEmitter{},
		gen.CDKAWSEmitter{},
		gen.CrossplaneEC2Emitter{},
		gen.BicepAWSEmitter{},
	)
	_ = os.Setenv("CORS_ORIGIN", "*")
	s := &httpapi.Server{Reg: reg, Store: st, Version: "test", Auth: nil}
	return s.Handler(), cleanup, nil
}
