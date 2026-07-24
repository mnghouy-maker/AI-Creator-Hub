/**
 * Prompt builders for the text tools. Kept in the worker (the only place that
 * calls the LLM). Each returns a system + user prompt tuned to the tool so the
 * same LLM interface produces the right shape of content per tool.
 */
interface Input {
  prompt: string;
  tone?: string;
  platform?: string;
  language?: string;
}

const toneLine = (i: Input) => (i.tone ? `Tone: ${i.tone}.` : '');
const langLine = (i: Input) => (i.language ? `Write in language code: ${i.language}.` : '');
const platformLine = (i: Input) => (i.platform ? `Target platform: ${i.platform}.` : '');

export function buildPrompt(tool: string, input: Input): { system: string; prompt: string } {
  const common = [toneLine(input), platformLine(input), langLine(input)].filter(Boolean).join(' ');
  switch (tool) {
    case 'script':
      return {
        system:
          'You are a senior short-form video scriptwriter. Produce a hook, body, and CTA. Keep it tight and spoken-word.',
        prompt: `Write a video script about: ${input.prompt}. ${common}`,
      };
    case 'blog':
      return {
        system:
          'You are an SEO content writer. Produce an H1, meta description, headings, and a strong CTA.',
        prompt: `Write an SEO blog post about: ${input.prompt}. ${common}`,
      };
    case 'social':
      return {
        system: 'You are a social media copywriter. Produce short and long caption variants.',
        prompt: `Write social captions about: ${input.prompt}. ${common}`,
      };
    case 'title':
      return {
        system: 'You write high-CTR titles. Produce 10 numbered title options.',
        prompt: `Write 10 titles about: ${input.prompt}. ${common}`,
      };
    case 'hashtags':
      return {
        system: 'You are a hashtag strategist. Produce 20 relevant, mixed-reach hashtags.',
        prompt: `Suggest hashtags for: ${input.prompt}. ${common}`,
      };
    default:
      return {
        system: 'You are a helpful content assistant.',
        prompt: input.prompt,
      };
  }
}
