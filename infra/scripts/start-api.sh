#!/bin/sh
# Combined API + worker start for single-container hosts (e.g. Render free tier,
# which has no separate background-worker service type).
#
# Order matters for deploy success detection: the platform marks the deploy
# healthy once the API binds its port and /api/health answers. So we (1) apply
# the schema with retries but NEVER let that block startup, (2) start the worker
# in the background, then (3) exec the API in the foreground as the port-holder.

echo "[start] applying database schema (prisma db push)…"
i=0
while [ "$i" -lt 5 ]; do
  if pnpm --filter @hub/db db:push; then
    echo "[start] schema applied."
    break
  fi
  i=$((i + 1))
  echo "[start] db not ready yet, retry $i/5 in 5s…"
  sleep 5
done
if [ "$i" -ge 5 ]; then
  echo "[start] WARNING: schema push did not succeed; starting anyway (will retry next boot)."
fi

echo "[start] launching worker (background) + API (foreground)…"
node apps/worker/dist/main.js &

# exec so the API is PID 1's foreground process and receives signals directly.
exec node apps/api/dist/main.js
