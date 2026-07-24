# Admin Panel (Phase 8)

The admin surface for running the business: revenue, users, the processing
queue, credits, coupons, announcements, feature flags, and system settings. The
whole workspace typechecks, lints, and builds (6/6).

## Access control

The entire admin API is gated with `@Roles('ADMIN','SUPERADMIN')`, enforced by
the global `RolesGuard` from Phase 4. A normal user calling any `/admin/*` route
gets **403** — the gate is server-side, not a hidden button. The sidebar's Admin
group is shown only to admins as a UX affordance; it is not the security
boundary.

## Everything mutating is audited

Every privileged write — role change, credit grant, flag toggle, coupon,
announcement, setting — writes an `AuditLog` row (actor, action, target,
metadata) inside `AdminService`. So "who granted 5,000 credits to whom, and
when" always has an answer (Architecture §6).

## What it shows / does

| Area                 | Backing                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Revenue**          | MRR derived from active paid subscriptions × plan prices in `@hub/shared` (can't drift from what we charge); lifetime revenue from paid invoices |
| **Users**            | Total + new-today; searchable list; change role; grant support credits (→ ledger `GRANT`, audited)                                               |
| **Subscriptions**    | Active paid subs by plan, with owner + period                                                                                                    |
| **Processing queue** | Live job counts by status + recent jobs (the "video processing queue" + failures)                                                                |
| **Error logs**       | `ErrorLog` feed                                                                                                                                  |
| **Coupons**          | List + create (app-managed, alongside Stripe promo codes)                                                                                        |
| **Announcements**    | List + create (in-app banners)                                                                                                                   |
| **Feature flags**    | List + toggle — the same flags that gate features (`video_translator`, `voice_cloning`, `paypal_checkout`, …)                                    |
| **System settings**  | Arbitrary key→JSON config                                                                                                                        |

## Endpoints

```
GET  /api/admin/metrics
GET  /api/admin/users?q=        PATCH /api/admin/users/:id/role     POST /api/admin/users/:id/credits
GET  /api/admin/subscriptions
GET  /api/admin/jobs            GET   /api/admin/errors
GET  /api/admin/coupons         POST  /api/admin/coupons
GET  /api/admin/announcements   POST  /api/admin/announcements
GET  /api/admin/flags           PATCH /api/admin/flags/:key
```

## Frontend

- `/admin` — KPI tiles (MRR, lifetime revenue, users, jobs), the plan
  breakdown, live feature-flag toggles, and the recent-jobs queue.
- `/admin/users` — search, inline role change, and a "Grant credits" action.

Both read the role-gated API with a sample fallback for preview, and the Admin
nav only appears for admins.

## Honest status

- Verified by typecheck/lint/build. Live figures need Postgres (the metrics are
  real aggregate queries); preview shows representative sample data.
- To make yourself an admin locally: set a user's `role` to `ADMIN` (Prisma
  Studio or `UPDATE "User" SET role='ADMIN'`), then the Admin nav appears.
