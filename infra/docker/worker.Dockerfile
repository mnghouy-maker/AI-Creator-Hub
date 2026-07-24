# Worker image. Includes ffmpeg — required by the video-translation pipeline
# (audio extract + mux). Kept separate from the API image so the two scale
# independently. Builds @hub/worker + its internal deps via Turbo.
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hub/db generate
RUN pnpm turbo run build --filter=@hub/worker...

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg
RUN corepack enable
COPY --from=builder /repo ./
CMD ["node", "apps/worker/dist/main.js"]
