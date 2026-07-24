# Preview Deploy — a real, interactive link

This gets AI Creator Hub running on a **public HTTPS URL** where sign-up, login,
credits, jobs, billing UI, and admin all work for real. Providers run on
**mocks** by default (no S3 or vendor keys needed); add `ANTHROPIC_API_KEY` to
make the text tools generate with real Claude.

Two paths:

- **[Render](#option-1-render-recommended)** — managed, near one-click, free tier,
  automatic HTTPS. Best for a quick throwaway preview.
- **[Single VM + Docker Compose](#option-2-single-vm--docker-compose)** — the
  exact production topology (one Nginx origin, MinIO storage). More control,
  needs a domain for HTTPS.

## Why the setup is the way it is

The session cookie is **http-only, `SameSite=Lax`, Secure**. Two consequences
drive everything below:

1. **HTTPS is required.** A Secure cookie is never stored over plain `http://`,
   so auth silently fails without TLS. Render gives HTTPS automatically; on a VM
   you need a domain (Cloudflare/Caddy).
2. **The browser must stay same-origin with the API.** A `Lax` cookie isn't sent
   across sites, and `*.onrender.com` subdomains are cross-site. So the browser
   only ever calls the **web** origin's `/api/*`, which is proxied to the API
   server-side (`apps/web/app/api/[...path]/route.ts`). Nothing to configure —
   just point the web app at the API with `API_INTERNAL_URL`.

---

## Option 1 — Render (recommended)

Everything is declared in [`render.yaml`](../render.yaml): Postgres, Redis, API,
worker, and web.

### Steps

1. Push this branch to GitHub (already done if you're reading this in the repo).
2. Go to **[dashboard.render.com](https://dashboard.render.com)** → **New +** →
   **Blueprint**.
3. Connect the repo and pick the branch. Render reads `render.yaml` and shows the
   five resources. Click **Apply** — it provisions and builds them.
4. Wait for **hub-api**, **hub-worker**, and **hub-web** to go live (first build
   ~5–8 min). The schema is applied automatically before the API starts
   (`pnpm --filter @hub/db db:push`).
5. **Wire the two cross-service URLs** (Render can't self-reference a URL at
   create time), then redeploy:
   - Copy the **hub-api** URL, e.g. `https://hub-api.onrender.com`.
     → set it as **`API_INTERNAL_URL`** on **hub-web**.
   - Copy the **hub-web** URL, e.g. `https://hub-web.onrender.com`.
     → set it as **`APP_URL`** on **hub-api**.
   - Click **Manual Deploy → Deploy latest** on hub-web and hub-api.
6. Open the **hub-web** URL → **Register** → you're in the dashboard.

### Turn on real Claude text (optional)

Add **`ANTHROPIC_API_KEY`** to both **hub-api** and **hub-worker** and redeploy.
The Script / Blog / Social / Title / Hashtag tools now return real model output;
everything else stays on mocks.

### Notes / free-tier caveats

- Free services **spin down when idle** — the first request after a nap takes
  ~30–50s to wake. Fine for a preview.
- Free Postgres is deleted after ~30 days. It's a throwaway; don't put anything
  precious in it.
- The verification email link is printed to the **hub-api logs** (no SMTP
  configured) — but login doesn't require verification, so you can ignore it.
- Make yourself admin: in the Render Postgres shell,
  `UPDATE "User" SET role='SUPERADMIN' WHERE email='you@example.com';` then open
  `/admin`.

---

## Option 2 — Single VM + Docker Compose

The production topology from [`infra/docker-compose.prod.yml`](../infra/docker-compose.prod.yml):
Nginx terminates **one origin** and routes `/api` → API, everything else → web;
Postgres, Redis, MinIO, the worker, and a one-off migration step come up
together. Because it's one origin, the same-origin proxy isn't even used.

### Steps

1. Create a small VM (2 GB+), e.g. DigitalOcean / Hetzner, with Docker + Docker
   Compose installed.
2. Point a domain at it (needed for HTTPS). Easiest: put **Cloudflare** in front
   (orange-cloud proxied, SSL mode Full) → free HTTPS, no cert wrangling on the box.
3. On the VM:
   ```bash
   git clone <your-repo> && cd AI-Creator-Hub
   cp .env.example .env
   # Edit .env — at minimum:
   #   AUTH_SECRET=<32+ random chars>     # openssl rand -hex 32
   #   APP_URL=https://your-domain
   #   POSTGRES_PASSWORD=<something strong>
   #   NEXT_PUBLIC_API_URL=              # leave EMPTY → same-origin /api
   docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
   ```
4. The `migrate` service pushes the schema, then API + worker start. Nginx listens
   on `:80`; Cloudflare fronts it with HTTPS. Open `https://your-domain`.

### Real Claude text

Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env` and `docker compose ... up -d` again.

---

## What works in the preview (mocks on)

Auth (email/password, sessions, 2FA), organizations, the **credit ledger**
(reserve → capture/release), **BullMQ jobs** end-to-end, the video-translation
pipeline and text tools (mock output unless Claude is enabled), projects,
billing **UI** (live Stripe checkout needs Stripe keys), admin (revenue, users,
queue, feature flags). It's the real app — only the external vendors are mocked.
