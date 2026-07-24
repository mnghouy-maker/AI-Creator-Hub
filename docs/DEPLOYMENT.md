# Deployment (Phase 9)

This phase makes the platform genuinely shippable: correct production container
builds, a one-command production stack behind Nginx, a CD pipeline, and a
migration strategy. The whole workspace builds, typechecks, and lints (6/6), and
the compiled `api` and `worker` were **booted from their `dist` output** to prove
the packaging works.

## The packaging fix (the important part)

Earlier phases consumed `@hub/*` as TypeScript **source** via tsconfig path
aliases. That compiles, but it produces a nested `dist` and — worse — leaves the
apps importing `.ts` files at runtime, so a container couldn't actually run.

Phase 9 switches to the standard monorepo model: **the shared packages compile
to `dist` and the apps consume the built output.**

- `@hub/shared`, `@hub/db`, `@hub/providers` build to `dist/index.js` +
  `.d.ts`; their `package.json` `main`/`types`/`exports` point there.
- They're compiled as **CommonJS** so the CommonJS API can `require()` them (an
  ESM package can't be `require`d) and the worker/Next can consume them too.
- The path aliases are gone, so each app's `tsc`/`nest build` compiles only its
  own `src` → a clean `apps/<app>/dist/main.js` entrypoint.
- Turbo's `^build` ordering builds packages before apps; verified end to end.

Proof: `node apps/worker/dist/main.js` boots and listens on all four queues;
`node apps/api/dist/main.js` resolves every `@hub/*` import and reaches its
Redis/DB connections.

## Container images

Three multi-stage Dockerfiles in `infra/docker/`:

| Image    | Builds                                                             | Runs                            |
| -------- | ------------------------------------------------------------------ | ------------------------------- |
| `api`    | `@hub/api...` (+ deps) via Turbo                                   | `node apps/api/dist/main.js`    |
| `worker` | `@hub/worker...`; image includes **ffmpeg** for the video pipeline | `node apps/worker/dist/main.js` |
| `web`    | `@hub/web...`; Next `output: 'standalone'`                         | `next start`                    |

Each stage generates the Prisma client and builds in dependency order.

## Production stack

`infra/docker-compose.prod.yml` brings up the whole platform:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

- **Nginx** terminates one origin and routes `/api` → NestJS, everything else →
  Next.js (with SSE buffering off for streaming; Architecture §3).
- A one-off **`migrate`** service runs `prisma migrate deploy` and must complete
  successfully before `api`/`worker` start — so schema changes ship atomically
  with the deploy.
- `postgres` + `redis` + `minio` are managed here for a self-hosted deploy; in a
  cloud deploy you'd point the env at managed equivalents instead.

## CI/CD

- **CI** (`ci.yml`) — format, typecheck, lint, build, test on every push.
- **CD** (`deploy.yml`) — on the default branch, builds all three production
  images to validate the Dockerfiles (with GHA layer caching). Shipping is a
  one-line change: add a registry login + `push: true`, then a compose-up step on
  the host. Kept credential-free so the pipeline is green out of the box.

## Migrations

`prisma migrate deploy` runs the committed migrations (never `migrate dev` in
prod). The migrate service gates the app services, and rollbacks are handled by
Prisma's migration history + a new corrective migration (forward-only, the safe
default for a live database).

## Real vs. mock providers

`getProviders()` in `@hub/providers` is the single switch. Today it returns the
mocks; wiring a real vendor is a per-provider line there, gated on the presence
of its API key (e.g. `ANTHROPIC_API_KEY` → real LLM, else mock). Nothing
downstream changes — the interfaces are the contract.

## Edge / CDN

Cloudflare in front provides TLS, WAF, and caching for static assets; large
uploads bypass all of it via presigned S3 URLs (Architecture §4.5), so the
proxy body-size limit only needs to cover normal API traffic.

## Honest status

- Container builds are validated by the CD workflow; a live deploy needs a host +
  real env (`AUTH_SECRET`, `DATABASE_URL`, provider/Stripe keys).
- Liveness is covered by `GET /api/health`; a deeper readiness probe (DB/Redis/S3)
  is a small addition when wiring real orchestration.
