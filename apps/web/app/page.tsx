/**
 * Marketing landing page. Composes the sections; the production build of the
 * approved Phase-1 prototype. Server-rendered shell with two client islands
 * (hero animation, pricing toggle) for a fast first paint.
 */
import { SiteNav } from '@/components/marketing/site-nav';
import { Hero } from '@/components/marketing/hero';
import { Features, Languages, SiteFooter } from '@/components/marketing/sections';
import { Pricing } from '@/components/marketing/pricing';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <div className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3.5 px-6 py-4">
            <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              Made for
            </span>
            {['YouTube', 'TikTok', 'Instagram', 'Podcasts', 'Agencies', 'Course creators'].map(
              (b) => (
                <span key={b} className="text-[15px] font-bold text-muted/80">
                  {b}
                </span>
              ),
            )}
          </div>
        </div>
        <Features />
        <Languages />
        <Pricing />
      </main>
      <SiteFooter />
    </>
  );
}
