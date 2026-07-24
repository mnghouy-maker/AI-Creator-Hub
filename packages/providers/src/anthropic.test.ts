/**
 * Anthropic adapter tests. We can't hit the real API in CI (no key, costs money,
 * non-deterministic), but the adapter's OWN logic is exactly what breaks in
 * practice: concatenating text blocks, mapping token usage into our TokenUsage
 * shape, and turning a `refusal` stop reason into a thrown error so the worker
 * releases the credit hold. So we stub the SDK's streaming client and assert
 * those three behaviors against the real `generateText` code path.
 */
import { describe, it, expect } from 'vitest';
import { AnthropicLLMProvider } from './anthropic';

/** Build a provider whose SDK client is a stub returning `message`. */
function providerReturning(message: unknown): AnthropicLLMProvider {
  const provider = new AnthropicLLMProvider('test-key');
  // Replace the real SDK client with a stub: stream(...).finalMessage() → message.
  (provider as unknown as { client: unknown }).client = {
    messages: {
      stream: () => ({ finalMessage: async () => message }),
    },
  };
  return provider;
}

describe('AnthropicLLMProvider', () => {
  it('concatenates text blocks and maps token usage', async () => {
    const provider = providerReturning({
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world.' },
      ],
      usage: { input_tokens: 42, output_tokens: 17 },
    });

    const res = await provider.generateText({ system: 's', prompt: 'p' });

    expect(res.text).toBe('Hello world.');
    expect(res.usage).toEqual({ inputTokens: 42, outputTokens: 17 });
  });

  it('ignores non-text blocks when collecting output', async () => {
    const provider = providerReturning({
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: 'internal' },
        { type: 'text', text: 'Visible answer.' },
      ],
      usage: { input_tokens: 5, output_tokens: 3 },
    });

    const res = await provider.generateText({ system: 's', prompt: 'p' });
    expect(res.text).toBe('Visible answer.');
  });

  it('throws on a refusal so the caller releases the credit hold', async () => {
    const provider = providerReturning({
      stop_reason: 'refusal',
      content: [],
      usage: { input_tokens: 5, output_tokens: 0 },
    });

    await expect(provider.generateText({ system: 's', prompt: 'p' })).rejects.toThrow(/declined/i);
  });

  it('reports a name that identifies the live model', () => {
    expect(new AnthropicLLMProvider('test-key').name).toContain('claude-opus-4-8');
  });
});
