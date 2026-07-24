/**
 * Cross-cutting domain enums and the shared job contract.
 *
 * These types are the "wire language" between web ↔ api ↔ worker. The concrete
 * database models arrive in Phase 3 (Prisma); these are the transport/enum
 * shapes that stay stable regardless of storage details.
 */

/** Coarse role for RBAC guards (Architecture §6). */
export type UserRole = 'user' | 'admin' | 'superadmin';

/** Lifecycle of any background AI job (Architecture §5.1). */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

/** Which tool produced a project — drives icons, filters, and cost rules. */
export type ProjectType =
  'video_translate' | 'subtitles' | 'voice' | 'script' | 'blog' | 'social' | 'image';

/** Stages the video pipeline reports for the live progress bar (Architecture §5.2). */
export const VIDEO_STAGES = ['extract', 'transcribe', 'translate', 'voice', 'merge'] as const;
export type VideoStage = (typeof VIDEO_STAGES)[number];

/** Credit ledger entry kinds — append-only, never mutated (Architecture §4.3). */
export type LedgerEntryType = 'grant' | 'hold' | 'debit' | 'refund' | 'adjustment';

/** Subscription state mirrored from Stripe (Architecture §5.3). */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
