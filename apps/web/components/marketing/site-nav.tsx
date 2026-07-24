/** Sticky marketing top-nav. Client component for the blur-on-scroll + toggle. */
'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#languages', label: 'Languages' },
  { href: '#pricing', label: 'Pricing' },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Logo />
        <nav className="ml-2 hidden gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
