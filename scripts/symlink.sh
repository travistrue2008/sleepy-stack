#!/bin/sh

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"
PACKAGES_DIR="${ROOT_DIR}/packages"

if [ ! -f "${ENV_FILE}" ]; then
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  echo "symlink: created .env from .env.example"
fi

for package_dir in "${PACKAGES_DIR}"/*/; do
  [ -d "${package_dir}" ] || continue

  package=$(basename "${package_dir}")
  link="${package_dir}.env"

  rm -f "${link}"
  ln -s ../../.env "${link}"
  echo "symlink: packages/${package}/.env -> ../../.env"
done

