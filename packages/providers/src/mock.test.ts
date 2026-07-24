/** Mock provider behavior — the deterministic backbone that keeps the whole
 *  pipeline runnable and testable without external keys. */
import { describe, it, expect } from 'vitest';
import { createMockProviders } from './mock';
import { getProviders } from './index';

describe('mock providers', () => {
  it('LLM returns text plus token usage', async () => {
    const { llm } = createMockProviders();
    const res = await llm.generateText({ system: 's', prompt: 'hello world' });
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.usage.inputTokens).toBeGreaterThan(0);
    expect(res.usage.outputTokens).toBeGreaterThan(0);
  });

  it('STT returns timestamped segments with a duration', async () => {
    const { stt } = createMockProviders();
    const res = await stt.transcribe({ audioKey: 'x', language: 'en' });
    expect(res.segments.length).toBeGreaterThan(0);
    expect(res.durationSeconds).toBeGreaterThan(0);
    // Segments are ordered and non-overlapping.
    for (let i = 1; i < res.segments.length; i++) {
      expect(res.segments[i]!.start).toBeGreaterThanOrEqual(res.segments[i - 1]!.end);
    }
  });

  it('TTS writes audio to storage and reports a duration', async () => {
    const providers = createMockProviders();
    const res = await providers.tts.synthesize({
      text: 'a'.repeat(140),
      voiceId: 'aria',
      language: 'en',
    });
    expect(res.audioKey).toContain('generated/audio');
    expect(res.durationSeconds).toBeGreaterThan(0);
    // The object is actually retrievable from the shared mock store.
    const bytes = await providers.storage.getObject(res.audioKey);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('TTS speed shortens the duration', async () => {
    const p = createMockProviders();
    const slow = await p.tts.synthesize({
      text: 'a'.repeat(280),
      voiceId: 'aria',
      language: 'en',
      speed: 1,
    });
    const fast = await p.tts.synthesize({
      text: 'a'.repeat(280),
      voiceId: 'aria',
      language: 'en',
      speed: 2,
    });
    expect(fast.durationSeconds).toBeLessThan(slow.durationSeconds);
  });

  it('getProviders() returns a stable singleton', () => {
    expect(getProviders()).toBe(getProviders());
  });
});
