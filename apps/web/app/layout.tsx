/**
 * Root layout — wraps every page with the theme provider and global tokens.
 * `suppressHydrationWarning` is required because next-themes sets the theme
 * class on <html> before React hydrates.
 */
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'AI Creator Hub — AI content studio',
  description:
    'Translate videos, generate voiceovers, write scripts and blogs, and produce social content with AI. Ship in every language.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
