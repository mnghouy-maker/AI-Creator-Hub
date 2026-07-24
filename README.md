<div align="center">

# 🎬 AI Creator Hub

**The AI content studio for creators, marketers, and agencies.**

Translate videos, generate voiceovers, write scripts and blogs, and produce
social content — all in one premium, fast, subscription platform.

`Free` · `Pro $20/mo` · `Business $49/mo` · `Agency $99/mo`

</div>

---

> **Build status:** This project is being built in reviewable phases. See the
> [phase roadmap](docs/ARCHITECTURE.md#11-phase-roadmap--approval-gates).
> **Phases 1–6 complete** — architecture, monorepo, database, native NestJS
> auth (email/OAuth/2FA/sessions), the full Next.js frontend, and the AI
> services (credits ledger, BullMQ jobs, video-translation pipeline, and text
> tools on adapter-based providers with mocks), and payments (Stripe checkout,
> portal, idempotent webhooks, invoices, referral rewards). The whole workspace
> passes typecheck, lint, and build. **Phase 8 (admin) is next.**

## What it does

| Capability                 | Description                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎥 **AI Video Translator** | Upload a video → dubbed audio + subtitles in 13+ languages (English, Khmer, Thai, Japanese, Chinese, Vietnamese, French, Spanish, German, Korean, Arabic, Portuguese, Russian). |
| 📝 **Subtitle Generator**  | Auto-transcribe and export `.srt` / `.vtt`.                                                                                                                                     |
| 🔊 **AI Voice Generator**  | Natural TTS voices (male / female / child / professional / news / narration) with speed & pitch control.                                                                        |
| ✍️ **Script Writer**       | YouTube, TikTok, Instagram, Facebook, ads, reviews, podcasts, educational.                                                                                                      |
| 📰 **Blog Writer**         | SEO-optimized long-form with headings, meta, keywords, tables, CTAs.                                                                                                            |
| 📣 **Social Tools**        | Titles, descriptions, hashtags, hooks, thumbnail ideas, captions.                                                                                                               |
| 🖼️ **AI Image Generator**  | Integrated image generation.                                                                                                                                                    |
| 🗂️ **Projects & Storage**  | Folders, tags, search, favorite, rename, duplicate, history.                                                                                                                    |
| 📅 **Content Calendar**    | Plan and schedule content.                                                                                                                                                      |
| 💳 **Billing**             | Stripe + PayPal, monthly/yearly, coupons, invoices, upgrade/downgrade.                                                                                                          |
| 🛠️ **Admin**               | Users, revenue, queue monitoring, error logs, credits, announcements, feature flags.                                                                                            |

## Tech stack

**Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · shadcn/ui
**Backend:** Node.js · NestJS · PostgreSQL · Prisma · Redis · BullMQ
**Storage:** S3-compatible object storage
**Auth:** Auth.js (email + Google + GitHub + 2FA)
**Payments:** Stripe (primary) · PayPal (secondary)
**Infra:** Docker · GitHub Actions · Nginx · Cloudflare

## Documentation

- 📐 [**Architecture**](docs/ARCHITECTURE.md) — system design, decisions, and the flows that define the product.
- 🗂️ [**Folder structure**](docs/FOLDER_STRUCTURE.md) — what lives where and why.
- 🗄️ [**Data model**](docs/DATA_MODEL.md) — the database schema explained.
- 🔐 [**Authentication**](docs/AUTHENTICATION.md) — sessions, OAuth, 2FA, and the security model.
- 🎨 [**Frontend & Dashboard**](docs/FRONTEND.md) — the Next.js app, design system, and UI architecture.
- 🤖 [**AI Services**](docs/AI_SERVICES.md) — providers, the credit lifecycle, jobs, and the video pipeline.
- 💳 [**Payments**](docs/PAYMENTS.md) — Stripe checkout, idempotent webhooks, invoices, and referrals.

## Repository layout

```
apps/web · apps/api · apps/worker · packages/db · packages/shared · infra · docs
```

Full explanation in [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md).

## Local development

```bash
cp .env.example .env      # fill in secrets
pnpm install              # install the whole workspace
pnpm infra:up             # start Postgres + Redis + MinIO (Docker)
pnpm db:generate          # generate the Prisma client
pnpm dev                  # run web + api + worker together
```

Requires Node 22+ and pnpm 9+.

---

<div align="center">
<sub>Built to be a production-grade, multi-tenant SaaS — not a demo.</sub>
</div>
