// Lambda entrypoint: ALB → Lambda invokes the same Chi router as the container API.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/MichaelJ43/iac-builder/api/internal/auth"
	"github.com/MichaelJ43/iac-builder/api/internal/crypto"
	"github.com/MichaelJ43/iac-builder/api/internal/gen"
	"github.com/MichaelJ43/iac-builder/api/internal/httpapi"
	"github.com/MichaelJ43/iac-builder/api/internal/store"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/core"
)

// albHandler adapts ALB target group events to net/http (same pattern as awslabs gin adapter).
type albHandler struct {
	core.RequestAccessorALB
	h http.Handler
}

func (a *albHandler) handle(ctx context.Context, req events.ALBTargetGroupRequest) (events.ALBTargetGroupResponse, error) {
	r, err := a.EventToRequestWithContext(ctx, req)
	if err != nil {
		return core.GatewayTimeoutALB(), core.NewLoggedError("convert ALB event: %v", err)
	}
	w := core.NewProxyResponseWriterALB()
	a.h.ServeHTTP(http.ResponseWriter(w), r)
	resp, err := w.GetProxyResponse()
	if err != nil {
		return core.GatewayTimeoutALB(), core.NewLoggedError("proxy response: %v", err)
	}
	return resp, nil
}

var (
	once    sync.Once
	handler *albHandler
)

func initHandler() {
	once.Do(func() {
		dsn := os.Getenv("SQLITE_DSN")
		if dsn == "" {
			dsn = "file:/tmp/iac-builder.sqlite?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"
		}
		mk, err := crypto.ParseMasterKey(os.Getenv("IAC_MASTER_KEY"))
		if err != nil {
			log.Fatalf("IAC_MASTER_KEY: %v", err)
		}
		st, err := store.OpenSQLite(dsn, mk)
		if err != nil {
			log.Fatalf("store: %v", err)
		}

		reg := gen.NewRegistry(
			gen.TerraformEmitter{},
			gen.CloudFormationEmitter{},
			gen.NewPulumiStub(),
			gen.NewBicepStub(),
			gen.NewCDKStub(),
		)
		ver := os.Getenv("APP_VERSION")
		if ver == "" {
			ver = "0.0.0-lambda"
		}
		srv := &httpapi.Server{Reg: reg, Store: st, Version: ver, Auth: auth.FromEnv()}
		handler = &albHandler{h: srv.Handler()}
	})
}

func main() {
	initHandler()
	lambda.Start(handler.handle)
}
