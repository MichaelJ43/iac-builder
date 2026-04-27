package main

import (
	"log"
	"net/http"
	"os"

	"github.com/MichaelJ43/iac-builder/api/internal/auth"
	"github.com/MichaelJ43/iac-builder/api/internal/crypto"
	"github.com/MichaelJ43/iac-builder/api/internal/gen"
	"github.com/MichaelJ43/iac-builder/api/internal/httpapi"
	"github.com/MichaelJ43/iac-builder/api/internal/store"
)

func main() {
	dsn := os.Getenv("SQLITE_DSN")
	if dsn == "" {
		dsn = "file:./data/app.sqlite?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
	}
	mk, err := crypto.ParseMasterKey(os.Getenv("IAC_MASTER_KEY"))
	if err != nil {
		log.Fatal(err)
	}
	st, err := store.OpenSQLite(dsn, mk)
	if err != nil {
		log.Fatal(err)
	}
	defer st.Close()

	reg := gen.NewRegistry(
		gen.TerraformEmitter{},
		gen.OpenTofuEmitter{},
		gen.CloudFormationEmitter{},
		gen.PulumiAWSEmitter{},
		gen.CDKAWSEmitter{},
		gen.CrossplaneEC2Emitter{},
		gen.BicepAWSEmitter{},
	)

	ver := os.Getenv("APP_VERSION")
	if ver == "" {
		ver = "0.0.0-dev"
	}
	srv := &httpapi.Server{Reg: reg, Store: st, Version: ver, Auth: auth.FromEnv()}
	addr := ":8080"
	if v := os.Getenv("LISTEN_ADDR"); v != "" {
		addr = v
	}
	log.Printf("listening %s", addr)
	log.Fatal(http.ListenAndServe(addr, srv.Handler()))
}
