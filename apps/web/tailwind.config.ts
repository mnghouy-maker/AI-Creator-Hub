/**
 * Tailwind config. Colors map to the CSS variables in globals.css so a single
 * token edit re-themes the whole app in both light and dark. `darkMode: class`
 * pairs with next-themes toggling `.dark` on <html>.
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        raise: 'hsl(var(--raise))',
        border: 'hsl(var(--border))',
        'border-2': 'hsl(var(--border-2))',
        text: 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        faint: 'hsl(var(--faint))',
        accent: { DEFAULT: 'hsl(var(--accent))', fg: 'hsl(var(--accent-fg))' },
        'accent-2': 'hsl(var(--accent-2))',
        good: 'hsl(var(--good))',
        warn: 'hsl(var(--warn))',
        crit: 'hsl(var(--crit))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 0.25rem)',
        sm: 'calc(var(--radius) - 0.4rem)',
        xl: 'calc(var(--radius) + 0.3rem)',
        '2xl': 'calc(var(--radius) + 0.6rem)',
      },
      boxShadow: {
        card: '0 1px 2px hsl(220 40% 4% / 0.06), 0 12px 34px -14px hsl(220 40% 4% / 0.16)',
        lift: '0 30px 70px -34px hsl(220 40% 4% / 0.3)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
