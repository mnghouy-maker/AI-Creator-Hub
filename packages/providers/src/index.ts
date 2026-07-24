/**
 * Provider factory. This is the single place that chooses real vs mock per
 * provider based on env — callers just `getProviders()` and depend on the
 * interfaces, never on a concrete vendor.
 *
 * Today the LLM is the first live vendor: when ANTHROPIC_API_KEY is set the text
 * tools run on real Claude; otherwise everything stays on deterministic mocks so
 * the full product (and CI) runs with zero keys. STT / TTS / image / storage
 * remain mocks until their real adapters land — and they share the mock storage
 * so the media pipeline keeps working end-to-end alongside a real LLM.
 */
export * from './interfaces.js';
export * from './mock.js';
export * from './anthropic.js';

import type { Providers } from './interfaces.js';
import { createMockProviders, MockLLMProvider } from './mock.js';
import { AnthropicLLMProvider } from './anthropic.js';

let cached: Providers | null = null;

/**
 * Returns the active provider set (cached as a singleton). The LLM is selected
 * from env; the rest are mocks for now. Adding the next real vendor (e.g. TTS)
 * is one more line here — feature code never changes.
 */
export function getProviders(): Providers {
  if (!cached) {
    const providers = createMockProviders();
    providers.llm = process.env.ANTHROPIC_API_KEY
      ? new AnthropicLLMProvider()
      : new MockLLMProvider();
    cached = providers;
  }
  return cached;
}
