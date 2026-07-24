/**
 * Cost-model tests. This is money math, so the edge cases matter: partial
 * minutes must round UP (we're billed per started minute), and per-generation /
 * per-image actions must ignore duration.
 */
import { describe, it, expect } from 'vitest';
import { estimateCredits, CREDIT_COSTS } from './credits';

describe('estimateCredits', () => {
  it('bills per-generation actions a flat rate', () => {
    expect(estimateCredits({ action: 'script' })).toBe(CREDIT_COSTS.script.credits);
    expect(estimateCredits({ action: 'blog' })).toBe(CREDIT_COSTS.blog.credits);
  });

  it('rounds partial minutes UP for per-minute actions', () => {
    // 90s = 2 started minutes → 2 × 30.
    expect(estimateCredits({ action: 'video_translate', durationSeconds: 90 })).toBe(60);
    // 1s still bills a full minute.
    expect(estimateCredits({ action: 'video_translate', durationSeconds: 1 })).toBe(30);
    // Exactly 60s = 1 minute.
    expect(estimateCredits({ action: 'video_translate', durationSeconds: 60 })).toBe(30);
  });

  it('never bills less than one minute, even for zero/missing duration', () => {
    expect(estimateCredits({ action: 'voice_tts', durationSeconds: 0 })).toBe(
      CREDIT_COSTS.voice_tts.credits,
    );
    expect(estimateCredits({ action: 'subtitles' })).toBe(CREDIT_COSTS.subtitles.credits);
  });

  it('scales per-image actions by image count', () => {
    expect(estimateCredits({ action: 'image', imageCount: 3 })).toBe(
      CREDIT_COSTS.image.credits * 3,
    );
    // Missing count defaults to 1.
    expect(estimateCredits({ action: 'image' })).toBe(CREDIT_COSTS.image.credits);
  });
});
