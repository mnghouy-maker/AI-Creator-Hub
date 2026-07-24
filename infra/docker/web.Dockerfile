# Next.js frontend image. Uses Next's standalone output for a minimal runtime.
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hub/web build

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /repo ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@hub/web", "start"]
