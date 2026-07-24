# Authentication (Phase 4)

Auth is implemented **natively in the NestJS API**, not with Auth.js. Rationale:
the architecture makes the API the single trust authority that issues the
principal every guard relies on (§4.6). Auth.js is built to live inside the
Next.js app, which would split that trust boundary. Implementing it in the API —
backed by the `User`/`Account`/`Session`/`VerificationToken` tables from Phase 3
— keeps identity in one place.

**Status:** the API typechecks, builds, lints, and passes CI end to end.

## What ships in this phase

| Capability            | How                                                                     |
| --------------------- | ----------------------------------------------------------------------- |
| Email + password      | scrypt hashing (Node built-in — no native deps), enumeration-safe login |
| Google + GitHub login | Passport strategies, registered only when their env creds exist         |
| Email verification    | single-use hashed token, emailed link (logged to console in dev)        |
| Password reset        | hashed token (1h), and a reset **revokes all sessions**                 |
| 2FA (TOTP)            | otplib + QR enrollment; secret **encrypted at rest** (AES-256-GCM)      |
| Session management    | list devices, revoke one, revoke all                                    |
| Rate limiting         | `@nestjs/throttler`, tighter limits on auth endpoints                   |

## The session model (JWT + cookie + DB)

The cookie holds a signed **JWT** (`hub_session`, http-only + secure +
sameSite=lax). Steady-state request verification is a fast, stateless signature
check. But the JWT embeds a session id (`sid`) mapping to a `Session` row — so we
can **revoke a device**, which a plain stateless JWT can't do. A short Redis
cache of "sid is valid" keeps verification off the DB in the hot path while still
honoring logout within ~a minute.

```
login ─▶ create Session row ─▶ sign JWT{sub, sid, role} ─▶ Set-Cookie(hub_session)
request ─▶ read cookie ─▶ verify JWT ─▶ (Redis hit) or (DB check sid live) ─▶ req.user = Principal
logout ─▶ delete Session row + Redis key ─▶ JWT now rejected on next request
```

Why this satisfies all three requirement bullets at once: it _is_ a JWT (JWT
auth), delivered in a **secure cookie**, with real **session management**.

## Secure by default

Two guards are registered **globally** (`APP_GUARD`), so protection isn't
opt-in per controller:

1. `AuthGuard` — every route requires a valid session unless marked `@Public()`.
   A forgotten decorator fails **closed** (401), never open.
2. `RolesGuard` — enforces `@Roles('admin' | 'superadmin')` where present
   (used by the Phase 8 admin panel).

Identity comes only from the verified session (`req.user`), never from the
request body.

## Signup provisioning is centralized

Every signup path — email/password **and** OAuth — funnels through
`ProvisioningService.createUserWithWorkspace`, which in a single transaction
creates the user, their **personal organization**, a **FREE subscription**, and
a **welcome credit GRANT** (as a ledger entry). No path can forget a step, and a
half-provisioned account can never exist. This is the auth layer honoring the
Phase-3 tenancy invariants.

## Endpoints

```
POST /api/auth/register           POST /api/auth/login          POST /api/auth/2fa/login
POST /api/auth/logout             GET  /api/auth/me             GET  /api/auth/sessions
DELETE /api/auth/sessions/:id     POST /api/auth/verify-email
POST /api/auth/forgot-password    POST /api/auth/reset-password
POST /api/auth/2fa/setup          POST /api/auth/2fa/confirm     POST /api/auth/2fa/disable
GET  /api/auth/google  → /google/callback
GET  /api/auth/github  → /github/callback
```

## Security choices worth calling out

- **Passwords**: scrypt (memory-hard) with per-password salt; constant-time
  verify. No plaintext ever stored or logged.
- **Enumeration protection**: login and "forgot password" return the same
  response whether or not the email exists.
- **Tokens at rest**: verification/reset tokens are stored **hashed** (SHA-256);
  the raw token only travels in the email link. TOTP seeds are AES-GCM encrypted.
- **CSRF**: sameSite=lax cookie isn't sent on cross-site requests; state-changing
  routes are POST/DELETE.
- **Input**: every body validated by a Zod schema via `ZodValidationPipe`.

## Deferred (by design)

- Real SMTP delivery → wired in Phase 7/9 (dev logs the link today).
- Referral **reward** grant on conversion → Phase 7 billing hook (the `Referral`
  row is created here as `PENDING`).
- Org-role guard for team routes → added with team features when they land.
