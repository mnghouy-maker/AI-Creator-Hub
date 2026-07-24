/**
 * Deterministic mock providers. These make the ENTIRE product runnable — sign
 * up, spend credits, run the video pipeline, get results — with zero external
 * keys and zero network calls, which is exactly what keeps the whole thing
 * testable in CI. Output is shaped like the real thing (timed segments, token
 * usage, storage keys) so swapping in real vendors changes nothing downstream.
 *
 * An in-memory object store stands in for S3 so the worker's read/write/merge
 * steps have something real to operate on during a run.
 */
import type { LanguageCode } from '@hub/shared';
import type {
  LLMProvider,
  SttProvider,
  TtsProvider,
  ImageProvider,
  StorageProvider,
  Providers,
  TranscriptSegment,
} from './interfaces.js';

// Roughly 4 chars/token — good enough for cost estimates in mock mode.
const estimateTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock-llm';
  async generateText(input: { system: string; prompt: string; maxTokens?: number }) {
    const text =
      `# Draft\n\n` +
      `_(mock output — a real LLM plugs in here behind the same interface)_\n\n` +
      `Prompt received: "${input.prompt.slice(0, 120)}"\n\n` +
      `- Point one that speaks to the audience\n` +
      `- Point two with a concrete example\n` +
      `- A clear call to action\n`;
    return {
      text,
      usage: {
        inputTokens: estimateTokens(input.system + input.prompt),
        outputTokens: estimateTokens(text),
      },
    };
  }
}

export class MockSttProvider implements SttProvider {
  readonly name = 'mock-stt';
  async transcribe(input: { audioKey: string; language?: LanguageCode }) {
    const segments: TranscriptSegment[] = [
      { start: 0, end: 3.2, text: 'Welcome to the reveal of our brand-new product.' },
      { start: 3.2, end: 7.0, text: 'It was built to save you hours every single week.' },
      { start: 7.0, end: 11.5, text: 'Let me show you exactly how it works.' },
    ];
    return {
      segments,
      detectedLanguage: (input.language ?? 'en') as LanguageCode,
      durationSeconds: 11.5,
    };
  }
}

export class MockTtsProvider implements TtsProvider {
  readonly name = 'mock-tts';
  private store: MockStorageProvider;
  constructor(store: MockStorageProvider) {
    this.store = store;
  }
  async synthesize(input: {
    text: string;
    voiceId: string;
    language: LanguageCode;
    speed?: number;
    pitch?: number;
  }) {
    const key = `generated/audio/${Date.now()}-${input.voiceId}.mp3`;
    await this.store.putObject(key, `MOCK_AUDIO(${input.text.length} chars)`, 'audio/mpeg');
    // ~14 chars/sec of speech at 1x; scaled by speed.
    const durationSeconds = Math.max(1, Math.round(input.text.length / 14 / (input.speed ?? 1)));
    return { audioKey: key, durationSeconds };
  }
}

export class MockImageProvider implements ImageProvider {
  readonly name = 'mock-image';
  private store: MockStorageProvider;
  constructor(store: MockStorageProvider) {
    this.store = store;
  }
  async generate(input: { prompt: string; size?: string }) {
    const key = `generated/images/${Date.now()}.png`;
    await this.store.putObject(key, `MOCK_IMAGE(${input.prompt.slice(0, 40)})`, 'image/png');
    return { imageKey: key };
  }
}

export class MockStorageProvider implements StorageProvider {
  readonly name = 'mock-storage';
  private objects = new Map<string, Buffer>();

  async getUploadUrl(input: { key: string; contentType: string }) {
    return {
      url: `https://mock-storage.local/upload/${encodeURIComponent(input.key)}`,
      key: input.key,
    };
  }
  async getDownloadUrl(key: string) {
    return `https://mock-storage.local/download/${encodeURIComponent(key)}`;
  }
  async putObject(key: string, body: Buffer | string, _contentType?: string) {
    this.objects.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body));
  }
  async getObject(key: string) {
    return this.objects.get(key) ?? Buffer.from('');
  }
}

/** Assemble a full mock provider set (storage shared across the media providers). */
export function createMockProviders(): Providers {
  const storage = new MockStorageProvider();
  return {
    llm: new MockLLMProvider(),
    stt: new MockSttProvider(),
    tts: new MockTtsProvider(storage),
    image: new MockImageProvider(storage),
    storage,
  };
}
