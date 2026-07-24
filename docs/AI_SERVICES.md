# AI Services (Phase 6)

This phase makes the product _do_ things: reserve credits, queue work, run the
video-translation pipeline and text tools on background workers, and settle the
bill. The whole workspace typechecks, lints, and builds (6/6), and the provider
and credit logic was demonstrated running end-to-end.

## Providers: interfaces + mocks (no keys required)

`@hub/providers` defines clean contracts — `LLMProvider`, `SttProvider`,
`TtsProvider`, `ImageProvider`, `StorageProvider` — and ships **deterministic
mock implementations**. This means the entire product runs (sign up → spend
credits → run the pipeline → get results) with **zero external API keys**, which
is exactly what keeps it verifiable in CI. Real vendors drop in behind the same
interfaces via the `getProviders()` factory in Phase 9 — feature code never
changes.

### Live provider: Anthropic Claude (text tools)

The LLM is the **first real vendor wired in**. When `ANTHROPIC_API_KEY` is set,
`getProviders().llm` is `AnthropicLLMProvider` (`packages/providers/src/anthropic.ts`)
and every text tool — script, blog, social, titles, hashtags — runs on real
**Claude (`claude-opus-4-8`)**. When the key is absent it stays on the mock, so
CI and local dev keep running keyless. STT / TTS / image / storage remain mocks
(and share the mock storage), so the media pipeline still works end-to-end
alongside a real LLM.

Adapter design decisions:

- **Model pinned to the flagship** (`claude-opus-4-8`) — quality is the product;
  the adapter doesn't silently downgrade to save cost.
- **Streams and awaits `finalMessage()`** rather than one blocking call, so long
  blog drafts at high `max_tokens` don't hit request timeouts.
- **Sends no `temperature`** — Opus 4.8 rejects it (400).
- **A `refusal` stop reason throws**, so the worker's `catch` **releases the
  credit hold** — the user is never charged for a declined generation.

Verify it in one command (real output with a key, mock without):

```bash
pnpm --filter @hub/providers build
ANTHROPIC_API_KEY=sk-ant-... node scripts/try-llm.mjs "your topic"
```

The adapter's own logic (text-block concatenation, usage mapping, refusal →
throw) is covered by `packages/providers/src/anthropic.test.ts` against the real
`generateText` path with a stubbed SDK client — no network, deterministic in CI.

## The credit lifecycle, now in code

The ledger primitives live in `@hub/db` so the **API and worker run the exact
same settlement code**:

```
reserve  (API)      holdCredits()         → CreditHold ACTIVE, checked Serializable
settle ✓ (worker)   captureHoldByJob()    → hold CAPTURED + DEBIT ledger entry (real cost)
settle ✗ (worker)   releaseHoldByJob()    → hold RELEASED, no charge
```

A request can't start work it can't pay for (reserve fails → **HTTP 402** via a
global filter, with the exact shortfall for a precise upsell), and a user is
never charged for work that didn't finish. Video jobs reserve on the client's
duration estimate and **capture the true cost** from the actual transcript — the
estimate-vs-final settlement the architecture calls for.

## Producer / consumer split

| Side                                            | Does                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **API** (`ai`, `video` modules → `JobsService`) | validate → reserve credits → create Project + Job → enqueue on the right BullMQ queue → return `jobId` |
| **Worker** (`processors/*`)                     | load the Job → call providers → update `stage`/`progress` → store result → capture/release the hold    |

Queues are split by work type (`ai-text`, `video-translate`, `voice-tts`,
`image-gen`) with per-queue concurrency (video lowest) so a burst of encodes
can't starve cheap text jobs.

### Video pipeline (the flagship)

`EXTRACT → TRANSCRIBE → TRANSLATE → VOICE → MERGE`, each stage written to the Job
row so the dashboard shows a real progress bar. Produces subtitle (`.srt`),
dubbed-audio, and rendered-video **Assets**, and marks the `Translation` row
complete.

## Endpoints added

```
GET  /api/credits/balance        GET  /api/credits/ledger
POST /api/ai/:tool               (script | blog | social | title | hashtags)
POST /api/video/upload-url       POST /api/video/translate
GET  /api/jobs                   GET  /api/jobs/:id     GET /api/jobs/:id/stream (SSE)
GET/PATCH/DELETE /api/projects   POST /api/projects/:id/duplicate
```

Every endpoint is org-scoped (multi-tenant isolation) and behind the global auth
guard from Phase 4.

## Frontend wiring

- The **Script Writer** tool page (`/tools/script`) is wired end-to-end: submit
  → `POST /ai/script` → poll the job → render the result, with a 402 → "upgrade"
  path. The other four text tools reuse the same `useJob` hook + form (a tool-name
  change), so they slot in directly.
- The topbar **credit balance** now reads `GET /credits/balance` (with a graceful
  sample fallback for preview).

## Honest status

- Runs on **mock providers**; real vendor adapters are Phase 9.
- Full HTTP end-to-end needs Postgres + Redis (not available in this CI sandbox),
  so it's verified by typecheck/build + a runnable demo of the provider pipeline
  and credit math. Bringing up `pnpm infra:up` locally exercises the full flow.
- Container packaging of the worker/API `dist` (clean single entrypoint) is a
  Phase 9 (Deployment) task.
