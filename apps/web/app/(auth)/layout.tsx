/**
 * Auth shell — a calm, centered split layout: form on the left, a branded
 * "studio" panel on the right (hidden on mobile). Shared by every auth page so
 * they feel like one coherent flow.
 */
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>
        <p className="text-center text-[13px] text-faint">
          © 2026 AI Creator Hub ·{' '}
          <Link href="/" className="hover:text-text">
            Back to site
          </Link>
        </p>
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-l border-border lg:block grad-hero">
        <div className="flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md text-[26px] font-bold leading-snug tracking-tight text-balance">
            “We dubbed a month of videos into Khmer and Thai in an afternoon. Our reach doubled.”
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-bold text-white">
              LK
            </span>
            <div>
              <div className="text-sm font-semibold">Lina Kim</div>
              <div className="text-[13px] text-muted">Head of Content, Northwind Media</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
