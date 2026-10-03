#!/bin/sh

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

(cd "${ROOT_DIR}/packages/ui" && bun install)
echo "install: packages/ui"
