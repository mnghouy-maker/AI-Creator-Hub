/**
 * Tailwind config. The design tokens here are the SAME palette validated in the
 * Phase-1 clickable prototype ("dubbing studio": cool ink grounds, coral signal
 * accent, teal output accent). shadcn/ui components (Phase 5) read these CSS
 * variables, so the whole app shares one theme in light and dark.
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mapped to CSS variables so light/dark switch happens in one place.
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        border: 'hsl(var(--border))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))', // coral signal
        'accent-2': 'hsl(var(--accent-2))', // teal = translated/output
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.1rem',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
