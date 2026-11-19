#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

: "${AMO_JWT_ISSUER:?Set AMO_JWT_ISSUER before signing}"
: "${AMO_JWT_SECRET:?Set AMO_JWT_SECRET before signing}"

bash build-extension.sh
npx web-ext sign \
  --source-dir dist \
  --channel unlisted \
  --api-key "$AMO_JWT_ISSUER" \
  --api-secret "$AMO_JWT_SECRET"

echo
echo "Signed JobFill package(s) are in web-ext-artifacts/."
