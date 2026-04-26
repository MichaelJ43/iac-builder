#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/lambda.zip}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
(
  cd "$ROOT/src/api"
  GOOS=linux GOARCH=arm64 CGO_ENABLED=0 GOSUMDB=off GOTOOLCHAIN=local go build -o "$WORKDIR/bootstrap" ./cmd/lambda
)
mkdir -p "$(dirname "$OUT")"
(
  cd "$WORKDIR"
  zip -q -r "$OUT" bootstrap
)
echo "Wrote $OUT"
