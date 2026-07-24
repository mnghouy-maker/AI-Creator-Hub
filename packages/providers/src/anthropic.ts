/**
 * Real LLM adapter — Anthropic Claude. This is the first live vendor behind the
 * provider interfaces: the text tools (script, blog, social, titles, hashtags)
 * call `providers.llm.generateText(...)` exactly as before, and get real model
 * output instead of the mock. Nothing downstream — the worker, credits, queues —
 * changes, because this implements the same `LLMProvider` contract.
 *
 * Design notes (why the code looks the way it does):
 *  - Model is pinned to `claude-opus-4-8`, the flagship. Quality is the product;
 *    we don't silently downgrade the model to save cost.
 *  - We STREAM and await `finalMessage()` rather than a single blocking call.
 *    Long blog drafts can take a while and push `max_tokens` high; streaming
 *    avoids request-timeout failures on exactly those slow, valuable jobs.
 *  - No `temperature` is sent — the Opus 4.8 API rejects it (400). Adaptive
 *    thinking is left at the model default.
 *  - A `refusal` stop reason is turned into a thrown error so the worker RELEASES
 *    the credit hold (no charge) instead of storing an empty result.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, TokenUsage } from './interfaces.js';

/** The flagship model. Deliberately not configurable per-call — quality first. */
const MODEL = 'claude-opus-4-8';

/** A sane ceiling for a single text-tool generation (a long blog fits easily). */
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = 'anthropic:claude-opus-4-8';
  private readonly client: Anthropic;

  /**
   * @param apiKey  Anthropic API key. Defaults to ANTHROPIC_API_KEY from the
   *                environment — the factory only constructs this when that var
   *                is set, so the key is always present here.
   */
  constructor(apiKey: string = process.env.ANTHROPIC_API_KEY ?? '') {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(input: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<{ text: string; usage: TokenUsage }> {
    // Stream, then collect the full message — robust for long/high-max_tokens
    // outputs that a single blocking call could time out on.
    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
    });

    const message = await stream.finalMessage();

    // The model declined the request; surface it so the caller releases the
    // credit hold rather than charging for empty output.
    if (message.stop_reason === 'refusal') {
      throw new Error('Anthropic declined to generate a response for this prompt.');
    }

    // Concatenate the text blocks (a text-only tool never gets tool_use blocks).
    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    return {
      text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }
}
