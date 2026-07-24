/**
 * Live LLM smoke test — "see it in action" without booting the whole stack.
 *
 * Runs one real text-tool generation through the SAME adapter the worker uses:
 * `getProviders().llm.generateText(...)`. With ANTHROPIC_API_KEY set you get real
 * Claude output; without it you get the deterministic mock. Either way it proves
 * the wiring end-to-end (factory → interface → provider) is intact.
 *
 * Usage:
 *   pnpm --filter @hub/providers build        # ensure dist is current
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/try-llm.mjs "your topic here"
 *   node scripts/try-llm.mjs "your topic"     # mock, no key needed
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getProviders } = require('../packages/providers/dist/index.js');

// A tiny inline prompt so this script has no build-time dependency on the
// worker. The worker uses its own richer prompts.ts for the same call.
const topic = process.argv[2] ?? 'why creators should localize their videos';
const system =
  'You are a senior short-form video scriptwriter. Produce a hook, body, and CTA. Keep it tight and spoken-word.';
const prompt = `Write a short video script about: ${topic}.`;

const { llm } = getProviders();

console.log(`Provider : ${llm.name}`);
console.log(`Topic    : ${topic}`);
console.log('—'.repeat(60));

const started = Date.now();
const { text, usage } = await llm.generateText({ system, prompt, maxTokens: 700 });
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

console.log(text);
console.log('—'.repeat(60));
console.log(
  `Tokens   : ${usage.inputTokens} in / ${usage.outputTokens} out   (${elapsed}s)`,
);
