# Folder Structure & Tooling (Phase 2)

This document explains **what lives where and why**. The guiding rule from
`ARCHITECTURE.md`: *apps depend on packages, never the reverse*, and each
deployable ships independently.

## Top level

```
ai-creator-hub/
├── apps/                  # Deployables (each becomes its own container)
│   ├── web/               # Next.js frontend — marketing + app + admin UI
│   ├── api/               # NestJS REST/SSE API + queue producers
│   └── worker/            # BullMQ consumers (video, voice, text, image)
├── packages/              # Shared libraries (never deployed alone)
│   ├── shared/            # Domain layer: plans, credits, languages, voices, types
│   └── db/                # Prisma schema, migrations, shared PrismaClient
├── infra/                 # Docker, Nginx, and other ops config
│   ├── docker/            # Per-service Dockerfiles (api/web/worker)
│   └── nginx/             # Reverse-proxy config for production
├── docs/                  # Architecture, folder structure, future ADRs
├── .github/workflows/     # CI pipeline
├── docker-compose.yml     # Local Postgres + Redis + MinIO (`pnpm infra:up`)
├── pnpm-workspace.yaml    # Declares apps/* and packages/* as workspaces
├── turbo.json             # Task graph + caching across the monorepo
├── tsconfig.base.json     # One TypeScript standard for everything
└── .env.example           # Documented env template (copy → .env)
```

## Why a monorepo (pnpm workspaces + Turborepo)

- **Shared types are shared, not copied.** `@hub/shared` defines plans, credit
  costs, languages, and the job contract once; web, api, and worker all import
  the same source. A pricing change is a one-line edit, not a three-repo hunt.
- **One dependency graph, cached builds.** Turborepo knows `api` depends on `db`
  and `shared`, builds them in order, and skips unchanged packages.
- **Independent deploys.** Each app has its own Dockerfile and can scale on its
  own — critical because workers (video encoding) scale very differently from
  the API.

## The packages

### `packages/shared` — the domain layer
Framework-agnostic TypeScript. The single source of truth for the business
model:
- `plans.ts` — the four plans, prices, credit grants, and entitlements (gates).
- `credits.ts` — the cost of every billable action + `estimateCredits()`.
- `languages.ts` / `voices.ts` — the supported catalogs.
- `types.ts` — cross-cutting enums and the job/ledger/subscription vocabulary.

Because these are data, **pricing and limits change without touching feature
code** (Architecture §9).

### `packages/db` — the data layer
Owns `prisma/schema.prisma`, migrations, and a **singleton `PrismaClient`** so
every app talks to Postgres the same way and doesn't exhaust the connection
pool. The schema here is a **placeholder** — the full model is Phase 3.

## The apps

| App | Framework | Role | Talks to |
|-----|-----------|------|----------|
| `web` | Next.js (App Router) | UI, marketing, dashboard, admin | `api` (HTTP), `@hub/shared` |
| `api` | NestJS | Auth, billing, projects, admin; **produces** jobs | Postgres, Redis, S3, providers |
| `worker` | Node + BullMQ | **Consumes** jobs; does the expensive AI work | Postgres, Redis, S3, providers |

The API and worker are split on purpose (Architecture §4.4): a burst of video
encodes must never block the API's event loop, and the two scale on different
curves.

## Tooling choices

- **TypeScript everywhere**, one `tsconfig.base.json` → no strictness drift.
- **Prettier** owns formatting; **ESLint (flat config)** owns correctness.
- **Turborepo** scripts: `pnpm dev | build | lint | typecheck | test` fan out to
  every workspace.
- **docker-compose** gives a new contributor Postgres + Redis + MinIO with
  `pnpm infra:up` — dev mirrors prod (MinIO speaks the S3 API).
- **GitHub Actions** runs format/typecheck/lint/build/test on every push — the
  gate behind the "production-ready" claim.

## What is intentionally still a stub after Phase 2

- `packages/db/prisma/schema.prisma` → real models in **Phase 3**.
- `apps/api/src/modules/*` → real feature modules in **Phases 4–8**.
- `apps/worker` processors → real pipelines in **Phase 6**.
- `apps/web` pages → full UI (matching the approved prototype) in **Phase 5**.

Everything above is wired so those phases slot in without rearranging the tree.
