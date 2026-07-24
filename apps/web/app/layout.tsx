/**
 * Root layout — wraps every page. Sets metadata (SEO for the marketing site)
 * and loads global tokens. Theme provider + fonts are added in Phase 5.
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Creator Hub — AI content studio',
  description:
    'Translate videos, generate voiceovers, write scripts and blogs, and produce social content with AI. Ship in every language.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
