# Multi-stage build for the NestJS API.
# Stage 1 installs the whole workspace and builds @hub/api + its internal deps
# (shared/db/providers) in dependency order via Turbo, so the compiled output
# resolves the @hub/* packages from their built dist (Phase 9 packaging fix).
# Stage 2 ships the built repo and runs the clean dist/main.js entrypoint.
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Generate the Prisma client, then build the API and everything it depends on.
RUN pnpm --filter @hub/db generate
RUN pnpm turbo run build --filter=@hub/api...

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /repo ./
EXPOSE 4000
# Clean single entrypoint (no nested paths) — the reason for the packaging fix.
CMD ["node", "apps/api/dist/main.js"]
