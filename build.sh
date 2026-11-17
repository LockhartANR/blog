#!/usr/bin/env bash
# Local build only. Publishing is a separate operation.
set -euo pipefail
cd "$(dirname "$0")"
npm run clean
npm run build
python3 ops/verify.py
