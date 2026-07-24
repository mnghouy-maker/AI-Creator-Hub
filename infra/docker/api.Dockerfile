# Multi-stage build for the NestJS API.
# Stage 1 installs the whole workspace (so @hub/* resolve) and builds.
# Stage 2 ships only production deps + compiled output → small, fast image.
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hub/db generate
RUN pnpm --filter @hub/api build

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /repo ./
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
