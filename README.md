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
> **Phase 1 (Architecture) is complete and awaiting review.** No application
> code is written until the architecture is approved.

## What it does

| Capability | Description |
|------------|-------------|
| 🎥 **AI Video Translator** | Upload a video → dubbed audio + subtitles in 13+ languages (English, Khmer, Thai, Japanese, Chinese, Vietnamese, French, Spanish, German, Korean, Arabic, Portuguese, Russian). |
| 📝 **Subtitle Generator** | Auto-transcribe and export `.srt` / `.vtt`. |
| 🔊 **AI Voice Generator** | Natural TTS voices (male / female / child / professional / news / narration) with speed & pitch control. |
| ✍️ **Script Writer** | YouTube, TikTok, Instagram, Facebook, ads, reviews, podcasts, educational. |
| 📰 **Blog Writer** | SEO-optimized long-form with headings, meta, keywords, tables, CTAs. |
| 📣 **Social Tools** | Titles, descriptions, hashtags, hooks, thumbnail ideas, captions. |
| 🖼️ **AI Image Generator** | Integrated image generation. |
| 🗂️ **Projects & Storage** | Folders, tags, search, favorite, rename, duplicate, history. |
| 📅 **Content Calendar** | Plan and schedule content. |
| 💳 **Billing** | Stripe + PayPal, monthly/yearly, coupons, invoices, upgrade/downgrade. |
| 🛠️ **Admin** | Users, revenue, queue monitoring, error logs, credits, announcements, feature flags. |

## Tech stack

**Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · shadcn/ui
**Backend:** Node.js · NestJS · PostgreSQL · Prisma · Redis · BullMQ
**Storage:** S3-compatible object storage
**Auth:** Auth.js (email + Google + GitHub + 2FA)
**Payments:** Stripe (primary) · PayPal (secondary)
**Infra:** Docker · GitHub Actions · Nginx · Cloudflare

## Documentation

- 📐 [**Architecture**](docs/ARCHITECTURE.md) — system design, decisions, and the flows that define the product.

## Repository status

This is an early-stage monorepo. The intended shape is:

```
apps/web · apps/api · apps/worker · packages/db · packages/shared · infra · docs
```

The full folder structure and tooling are delivered in **Phase 2**.

---

<div align="center">
<sub>Built to be a production-grade, multi-tenant SaaS — not a demo.</sub>
</div>
