/**
 * Supported translation/dubbing languages.
 *
 * Why this lives in @hub/shared: the frontend language pickers, the API's
 * request validation, and the worker's STT/MT/TTS routing must all agree on the
 * exact same set of language codes. Defining it once prevents the classic bug
 * where the UI offers a language the backend can't actually process.
 */

export interface Language {
  /** BCP-47 code used when calling translation/TTS providers. */
  code: string;
  /** English display name. */
  name: string;
  /** Endonym (name in the language itself) — shown in pickers for clarity. */
  native: string;
  /** Emoji flag for compact UI. */
  flag: string;
  /** Whether premium/natural TTS voices exist for this language. */
  hasVoices: boolean;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', hasVoices: true },
  { code: 'km', name: 'Khmer', native: 'ខ្មែរ', flag: '🇰🇭', hasVoices: true },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', hasVoices: true },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', hasVoices: true },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳', hasVoices: true },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', hasVoices: true },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', hasVoices: true },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', hasVoices: true },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', hasVoices: true },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', hasVoices: true },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', hasVoices: true },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹', hasVoices: true },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', hasVoices: true },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Fast lookup used throughout the API/worker. */
export const LANGUAGE_BY_CODE: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
);

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
