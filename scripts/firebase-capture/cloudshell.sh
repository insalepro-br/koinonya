#!/usr/bin/env bash
# Roda a captura no Google Cloud Shell (navegador), usando a conta já logada no console.
# Nada é gravado no Firebase. Resultado: ~/koinonya-captura-<data>.zip, pronto para baixar.
set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-gen-lang-client-0519033383}"
PNPM_VERSION="12.18.0"
HERE="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$HOME/koinonya-captura-$STAMP"

cd "$HERE"
gcloud config set project "$PROJECT" >/dev/null 2>&1
export GOOGLE_CLOUD_PROJECT="$PROJECT"
export GOOGLE_CLOUD_QUOTA_PROJECT="$PROJECT"

echo "Conta: $(gcloud config get-value account 2>/dev/null)"
echo "Node:  $(node -v)"

pnpm() { npx --yes "pnpm@$PNPM_VERSION" "$@"; }
pnpm install --frozen-lockfile

run_capture() { pnpm capture --out "$OUT" "$@"; }

set +e
run_capture "$@"
code=$?
set -e

if [ "$code" -eq 1 ]; then
  echo
  echo "Credencial padrão indisponível. Faça login de aplicação (abre link, copie o código de volta):"
  gcloud auth application-default login --no-launch-browser
  gcloud auth application-default set-quota-project "$PROJECT"
  set +e
  run_capture "$@"
  code=$?
  set -e
fi

if [ -d "$OUT" ]; then
  (cd "$(dirname "$OUT")" && zip -qr "$OUT.zip" "$(basename "$OUT")")
  echo
  echo "Pronto: $OUT.zip"
  echo "Baixe pelo menu ⋮ do Cloud Shell → Download → $OUT.zip"
  echo "Ou rode: cloudshell download $OUT.zip"
fi

exit "$code"
