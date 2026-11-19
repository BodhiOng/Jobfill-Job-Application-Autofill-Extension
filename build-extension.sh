#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "Building JobFill..."
npm install
npm run typecheck
npm run build
rm -f JobFill-1.0.0.zip
zip -r JobFill-1.0.0.zip dist

echo
echo "JobFill package created: JobFill-1.0.0.zip"
