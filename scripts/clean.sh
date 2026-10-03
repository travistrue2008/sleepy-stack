#!/bin/sh

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

find "${ROOT_DIR}/packages" -maxdepth 2 -name node_modules -type d -exec rm -rf {} +
rm -rf "${ROOT_DIR}/node_modules"

echo "clean: removed all node_modules"
