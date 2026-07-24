/**
 * Credit cost model — the price of every billable AI action, in credits.
 *
 * Architecture §2/§5.1: credits are reserved (held) before a job runs and only
 * finalized on success. This file defines the ESTIMATE used for the hold. The
 * worker computes the final cost the same way once the true size (e.g. actual
 * video duration) is known, then debits/refunds the difference.
 *
 * Keeping costs here (not in features) means margins are tunable in one place.
 */

export type BillableAction =
  | 'video_translate' // per minute of source video
  | 'subtitles' // per minute
  | 'voice_tts' // per minute of generated audio
  | 'script' // per generation
  | 'blog' // per generation
  | 'social_caption' // per generation
  | 'title' // per generation
  | 'hashtags' // per generation
  | 'image'; // per image

/** Unit each action is billed by — drives how the estimate is computed. */
export type BillingUnit = 'per_minute' | 'per_generation' | 'per_image';

export interface CostRule {
  unit: BillingUnit;
  /** Credits charged per unit. */
  credits: number;
}

export const CREDIT_COSTS: Record<BillableAction, CostRule> = {
  video_translate: { unit: 'per_minute', credits: 30 },
  subtitles: { unit: 'per_minute', credits: 8 },
  voice_tts: { unit: 'per_minute', credits: 15 },
  script: { unit: 'per_generation', credits: 12 },
  blog: { unit: 'per_generation', credits: 8 },
  social_caption: { unit: 'per_generation', credits: 3 },
  title: { unit: 'per_generation', credits: 2 },
  hashtags: { unit: 'per_generation', credits: 2 },
  image: { unit: 'per_image', credits: 10 },
};

export interface EstimateInput {
  action: BillableAction;
  /** Required for per_minute actions (source/output duration in seconds). */
  durationSeconds?: number;
  /** Required for per_image actions. */
  imageCount?: number;
}

/**
 * Compute the credit cost of an action. Used by the API to size the hold and by
 * the worker to compute the final debit. Rounds minutes UP so partial minutes
 * are billed — matching how the providers charge us.
 */
export function estimateCredits(input: EstimateInput): number {
  const rule = CREDIT_COSTS[input.action];
  switch (rule.unit) {
    case 'per_minute': {
      const minutes = Math.max(1, Math.ceil((input.durationSeconds ?? 0) / 60));
      return rule.credits * minutes;
    }
    case 'per_image':
      return rule.credits * Math.max(1, input.imageCount ?? 1);
    case 'per_generation':
      return rule.credits;
  }
}
