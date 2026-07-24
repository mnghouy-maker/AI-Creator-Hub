/** Wraps next-themes so the whole app supports light/dark with system default
 *  and no flash. Toggles the `.dark` class Tailwind reads. */
'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
