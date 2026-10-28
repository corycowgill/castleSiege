#!/usr/bin/env bash
# Runs the regression suite against a local static server.
#   tests/run.sh          smoke + mechanics + autoplay
#   tests/run.sh balance  also the (slow) balance simulation
# Needs Node and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8765}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
export PORT
status=0
for t in smoke mechanics autoplay; do
  echo "== $t"; node "tests/$t.js" || status=1
done
if [ "${1:-}" = "balance" ]; then echo "== balance"; node tests/balance.js "$PORT" || status=1; fi
exit $status
