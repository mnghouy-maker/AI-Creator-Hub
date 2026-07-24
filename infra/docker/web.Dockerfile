# Next.js frontend image. Builds @hub/web + its deps; runs `next start`.
# (next.config sets output:'standalone' so the build stays lean.)
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hub/db generate
# NEXT_PUBLIC_* is inlined into the browser bundle at build time. Left empty, the
# client calls a same-origin relative /api (the safe default; see lib/api.ts).
# Override only for a split-origin, same-site custom-domain setup.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm turbo run build --filter=@hub/web...

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /repo ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@hub/web", "start"]
