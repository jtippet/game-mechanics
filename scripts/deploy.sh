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

# static-web0 has no rsync, so ship a tarball over ssh into a staging
# directory beside the target and swap it in with one rename: the old tree
# is replaced whole (stale hashed assets go with it) and readers never see
# a half-copied directory. Files are created by root; the setgid bit on
# /srv/static assigns group staticpub, and the chmod keeps them group-writable
# like the rest of the box.
STAGE="${DEST%/}.new"
OLD="${DEST%/}.old"
tar -C dist -cf - . | ssh "$HOST" "set -e
  rm -rf '$STAGE' '$OLD'
  mkdir -p '$STAGE'
  tar -C '$STAGE' --no-same-owner -xf -
  chmod -R ug+rw,o+rX '$STAGE'
  find '$STAGE' -type d -exec chmod g+s {} +
  if [ -d '${DEST%/}' ]; then mv '${DEST%/}' '$OLD'; fi
  mv '$STAGE' '${DEST%/}'
  rm -rf '$OLD'"

# Verify from inside the box: gw0 only lets edge0 reach nginx on :80.
code=$(ssh "$HOST" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1$URL_PATH")
if [ "$code" != "200" ]; then
  echo "deploy verify failed: nginx returned $code for $URL_PATH" >&2
  exit 1
fi
echo "published: https://static.tippet.net$URL_PATH ($(git rev-parse --short HEAD))"
