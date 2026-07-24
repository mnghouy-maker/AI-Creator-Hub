/**
 * Provider contracts. Feature code and workers depend ONLY on these interfaces,
 * never on a concrete vendor SDK — so swapping Anthropic↔OpenAI, or one TTS
 * vendor for another, is a one-line factory change (Architecture §3 "External
 * providers" boundary). Each method returns the minimal shape the pipeline needs
 * plus usage metadata for the per-job cost accounting (Architecture §7).
 */
import type { LanguageCode } from '@hub/shared';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Large language model — powers every text tool (script, blog, social, …). */
export interface LLMProvider {
  readonly name: string;
  generateText(input: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<{ text: string; usage: TokenUsage }>;
}

/** A transcript segment with timestamps (drives subtitle timing). */
export interface TranscriptSegment {
  start: number; // seconds
  end: number;
  text: string;
}

/** Speech-to-text — the "transcribe" stage of the video pipeline. */
export interface SttProvider {
  readonly name: string;
  transcribe(input: { audioKey: string; language?: LanguageCode }): Promise<{
    segments: TranscriptSegment[];
    detectedLanguage: LanguageCode;
    durationSeconds: number;
  }>;
}

/** Text-to-speech — the "voice" stage + the standalone Voice Studio. */
export interface TtsProvider {
  readonly name: string;
  synthesize(input: {
    text: string;
    voiceId: string;
    language: LanguageCode;
    speed?: number;
    pitch?: number;
  }): Promise<{ audioKey: string; durationSeconds: number }>;
}

/** Image generation — thumbnails and post visuals. */
export interface ImageProvider {
  readonly name: string;
  generate(input: { prompt: string; size?: string }): Promise<{ imageKey: string }>;
}

/**
 * Object storage. Uploads use presigned URLs so large video bytes go
 * browser→storage directly (Architecture §4.5); the worker reads/writes objects
 * during processing.
 */
export interface StorageProvider {
  readonly name: string;
  /** Presigned URL the browser PUTs the raw upload to. */
  getUploadUrl(input: { key: string; contentType: string }): Promise<{ url: string; key: string }>;
  /** Short-lived URL to read a private object (returned to the owner only). */
  getDownloadUrl(key: string): Promise<string>;
  putObject(key: string, body: Buffer | string, contentType?: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}

/** The full set of providers the app wires up once at boot. */
export interface Providers {
  llm: LLMProvider;
  stt: SttProvider;
  tts: TtsProvider;
  image: ImageProvider;
  storage: StorageProvider;
}
