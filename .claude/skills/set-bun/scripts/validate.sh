#!/bin/sh
# validate.sh <version>
# Exit 0 and print OK if <version> is exactly X.Y.Z. Otherwise print REJECT with
# the broken rule and exit 2. Never coerces: no stripping a v, no filling in a
# missing patch, no resolving ranges, wildcards or latest.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
. "$here/lib.sh"
require_version "${1-}"
echo "OK $VERSION"
