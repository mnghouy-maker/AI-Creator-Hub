/**
 * Voice catalog for the AI Voice Generator and video dubbing.
 *
 * The `tier` field gates premium voices behind paid plans (see plans.ts).
 * Speed/pitch ranges are shared so the UI slider bounds and the worker's
 * TTS request validation can never disagree.
 */

export type VoiceGender = 'male' | 'female' | 'child';
export type VoiceStyle = 'natural' | 'professional' | 'news' | 'narration';
export type VoiceTier = 'free' | 'premium';

export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  style: VoiceStyle;
  tier: VoiceTier;
}

export const VOICES: readonly Voice[] = [
  { id: 'aria', name: 'Aria', gender: 'female', style: 'natural', tier: 'free' },
  { id: 'leo', name: 'Leo', gender: 'male', style: 'natural', tier: 'free' },
  { id: 'sena', name: 'Sena', gender: 'female', style: 'professional', tier: 'premium' },
  { id: 'marcus', name: 'Marcus', gender: 'male', style: 'news', tier: 'premium' },
  { id: 'noor', name: 'Noor', gender: 'female', style: 'narration', tier: 'premium' },
  { id: 'kai', name: 'Kai', gender: 'child', style: 'natural', tier: 'premium' },
] as const;

/** Bounds shared by the UI sliders and the worker's TTS validation. */
export const VOICE_SPEED = { min: 0.5, max: 2.0, default: 1.0 } as const;
export const VOICE_PITCH = { min: -12, max: 12, default: 0 } as const;
