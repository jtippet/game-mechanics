#!/usr/bin/env bash
# Build and publish the sampler to static.tippet.net.
# This is the ONLY file in the repo that knows the host. The build itself is
# host-independent (relative asset URLs, hash routing); see README.md.
#
# static-web0 (CT 318) is plain nginx over /srv/static, group staticpub with
# the setgid bit, reachable as root over the operator key from dev0. Auth is
# entirely at edge0 (SSO), so nothing here needs a credential of its own.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${MECHANICS_HOST:-root@10.180.1.108}"
DEST="${MECHANICS_DEST:-/srv/static/mechanics/}"
URL_PATH="${MECHANICS_URL_PATH:-/mechanics/}"

pnpm build
test -f dist/index.html

# --chmod keeps files group-writable like the rest of /srv/static; --no-o
# --no-g stop rsync (run as root) from forcing root ownership onto the
# copied files, so the directory's setgid bit then assigns them group
# staticpub instead.
rsync -a --no-o --no-g --delete --chmod=Dg+s,ug+rw,o+rX dist/ "$HOST:$DEST"

# Verify from inside the box: gw0 only lets edge0 reach nginx on :80.
code=$(ssh "$HOST" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1$URL_PATH")
if [ "$code" != "200" ]; then
  echo "deploy verify failed: nginx returned $code for $URL_PATH" >&2
  exit 1
fi
echo "published: https://static.tippet.net$URL_PATH ($(git rev-parse --short HEAD))"
