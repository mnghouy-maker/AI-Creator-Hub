/**
 * The authenticated principal.
 *
 * This is the ONLY thing downstream code trusts about "who is calling"
 * (Architecture §4.6). It is derived from a verified session on every request
 * and attached to `req.user`. Nothing from the request body is ever trusted for
 * identity.
 */
import type { UserRole } from '@hub/db';

export interface Principal {
  userId: string;
  email: string;
  role: UserRole;
  /** The session (device) this request belongs to — enables per-device revoke. */
  sessionId: string;
}

/** Claims we put inside the session JWT (kept minimal; the DB is the truth). */
export interface SessionJwtClaims {
  sub: string; // userId
  sid: string; // sessionId
  role: UserRole;
}

/** Short-lived ticket issued between password step and 2FA step. */
export interface TwoFactorTicketClaims {
  sub: string; // userId
  pending2fa: true;
}
