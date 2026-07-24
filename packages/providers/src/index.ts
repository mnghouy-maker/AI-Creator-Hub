/**
 * Provider factory. Today it returns the mock set; when real credentials land in
 * Phase 9 this is the single place that chooses real vs mock per provider based
 * on env. Callers just `getProviders()` and depend on the interfaces.
 */
export * from './interfaces.js';
export * from './mock.js';

import type { Providers } from './interfaces.js';
import { createMockProviders } from './mock.js';

let cached: Providers | null = null;

/**
 * Returns the active provider set (cached as a singleton). Real implementations
 * will be selected here, e.g.:
 *   llm: process.env.ANTHROPIC_API_KEY ? new AnthropicLLM(...) : new MockLLMProvider()
 * Until those exist, everything runs on deterministic mocks.
 */
export function getProviders(): Providers {
  if (!cached) cached = createMockProviders();
  return cached;
}
