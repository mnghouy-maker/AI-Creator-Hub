/**
 * Input for the text tools. One flexible schema covers script/blog/social/
 * title/hashtags: a brief plus optional tone/platform/language. The worker uses
 * the tool + these fields to build the actual prompt.
 */
import { z } from 'zod';

export const TEXT_TOOLS = ['script', 'blog', 'social', 'title', 'hashtags'] as const;
export type TextTool = (typeof TEXT_TOOLS)[number];

export const generateSchema = z.object({
  /** The topic or brief, e.g. "5 tips for faster video editing". */
  prompt: z.string().min(3).max(2000),
  tone: z.string().max(60).optional(),
  platform: z.string().max(60).optional(),
  language: z.string().max(10).optional(),
});
export type GenerateDto = z.infer<typeof generateSchema>;
