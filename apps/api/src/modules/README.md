# API feature modules

Each subfolder here is a self-contained NestJS feature module — its own
controller(s), service(s), DTOs (Zod-validated), and guards. This mirrors the
clean, modular architecture from `docs/ARCHITECTURE.md` §4.2: one concern per
module, independently testable and ownable.

Planned modules and the phase that delivers each:

| Module           | Responsibility                                                                   | Phase |
| ---------------- | -------------------------------------------------------------------------------- | ----- |
| `auth/`          | Email + Google + GitHub login, email verification, password reset, 2FA, sessions | 4     |
| `users/`         | Profile, roles, settings                                                         | 4     |
| `credits/`       | Append-only ledger: grant / hold / debit / refund                                | 6     |
| `projects/`      | Folders, tags, search, favorite, rename, duplicate                               | 5–6   |
| `ai/`            | Text tools: script, blog, social, title, hashtags, image                         | 6     |
| `video/`         | Upload signing + video-translation job orchestration                             | 6     |
| `billing/`       | Stripe + PayPal, checkout, webhooks, invoices                                    | 7     |
| `admin/`         | User/subscription management, revenue, queue, logs, flags                        | 8     |
| `notifications/` | In-app + email notifications                                                     | 5     |

The API **produces** jobs onto BullMQ queues; the heavy work runs in
`apps/worker`. See `docs/ARCHITECTURE.md` §5.1 for the credit-lifecycle flow
that ties producers, the ledger, and workers together.
