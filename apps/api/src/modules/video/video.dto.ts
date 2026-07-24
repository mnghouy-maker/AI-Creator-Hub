/** Inputs for the video-translation flow. */
import { z } from 'zod';
import { LANGUAGE_CODES } from '@hub/shared';

const languageCode = z.enum(LANGUAGE_CODES as [string, ...string[]]);

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(260),
  contentType: z.string().min(1).max(120),
});
export type UploadUrlDto = z.infer<typeof uploadUrlSchema>;

export const translateSchema = z.object({
  assetId: z.string().min(1),
  targetLanguage: languageCode,
  sourceLanguage: languageCode.optional(),
  voiceId: z.string().optional(),
  /** Client-measured duration for the up-front credit estimate; the worker
   *  recomputes the true cost from the actual transcript and captures that. */
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 4),
});
export type TranslateDto = z.infer<typeof translateSchema>;
