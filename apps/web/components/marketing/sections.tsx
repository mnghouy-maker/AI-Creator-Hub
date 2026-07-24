/** Static marketing sections: feature grid, language chips, footer. Server
 *  components — no interactivity, so they render on the server for fast paint.
 *  The language list comes from @hub/shared so it can't fall out of sync. */
import Link from 'next/link';
import {
  Film,
  Captions,
  AudioWaveform,
  FileText,
  Newspaper,
  Hash,
  Image as ImageIcon,
  CalendarDays,
  FolderTree,
} from 'lucide-react';
import { LANGUAGES } from '@hub/shared';
import { Logo } from '@/components/logo';

const FEATURES = [
  {
    icon: Film,
    t2: false,
    title: 'AI Video Translator',
    tag: 'Flagship',
    desc: 'MP4, MOV, AVI, MKV in — dubbed video with lip-timed speech and subtitles out, in 13 languages.',
  },
  {
    icon: Captions,
    t2: true,
    title: 'Subtitle Generator',
    desc: 'Word-accurate transcripts with timestamps, exported to .srt and .vtt in a click.',
  },
  {
    icon: AudioWaveform,
    t2: true,
    title: 'AI Voice Generator',
    desc: 'Natural voices — male, female, child, news, narration — with speed and pitch control.',
  },
  {
    icon: FileText,
    t2: false,
    title: 'Script Writer',
    desc: 'Hooks and full scripts for YouTube, TikTok, Reels, ads, reviews, podcasts, and courses.',
  },
  {
    icon: Newspaper,
    t2: false,
    title: 'Blog Writer',
    desc: 'SEO long-form with headings, meta descriptions, keywords, tables, and clean CTAs.',
  },
  {
    icon: Hash,
    t2: true,
    title: 'Social Tools',
    desc: 'Titles, descriptions, hashtags, thumbnail ideas, and short + long captions, on brand.',
  },
  {
    icon: ImageIcon,
    t2: false,
    title: 'AI Image Generator',
    desc: 'Thumbnails and post visuals generated in your aspect ratios, saved to the project.',
  },
  {
    icon: CalendarDays,
    t2: true,
    title: 'Content Calendar',
    desc: 'Plan, schedule, and track every post across channels from one shared calendar.',
  },
  {
    icon: FolderTree,
    t2: false,
    title: 'Projects & Storage',
    desc: 'Folders, tags, search, favorites, rename, duplicate — every render kept and versioned.',
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
          One studio · every format
        </span>
        <h2 className="mt-3 text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-balance">
          Everything you need to make content, minus the busywork.
        </h2>
        <p className="mt-3 text-muted">
          Twelve AI tools that share one project workspace, one credit balance, and one very fast
          interface.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, t2, title, tag, desc }) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-faint hover:shadow-lift"
          >
            {tag && (
              <span className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-wide text-faint">
                {tag}
              </span>
            )}
            <span
              className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${
                t2 ? 'bg-accent-2/12 text-accent-2' : 'bg-accent/12 text-accent'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-[16.5px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Languages() {
  return (
    <section id="languages" className="mx-auto max-w-6xl px-6 pb-4">
      <div className="max-w-2xl">
        <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
          Reach further
        </span>
        <h2 className="mt-3 text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-balance">
          Translate and dub into {LANGUAGES.length} languages — with more shipping monthly.
        </h2>
        <p className="mt-3 text-muted">
          Every language gets natural voices and subtitle export. Khmer, Thai, and Vietnamese
          included — not an afterthought.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <span
            key={l.code}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:border-accent-2 hover:text-text"
          >
            {l.flag} {l.name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter() {
  const cols = [
    { h: 'Product', links: ['Video Translator', 'Voice Generator', 'Blog Writer', 'Pricing'] },
    { h: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
    { h: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Refunds'] },
  ];
  return (
    <footer className="border-t border-border bg-surface py-11">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="max-w-[280px]">
            <Logo />
            <p className="mt-3 text-sm text-muted">
              The AI content studio for creators, marketers, and agencies. Ship in every language.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h5 className="mb-3 font-mono text-[12px] uppercase tracking-[0.1em] text-faint">
                {c.h}
              </h5>
              {c.links.map((l) => (
                <Link key={l} href="#" className="block py-1 text-sm text-muted hover:text-text">
                  {l}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-2 pt-5 text-[13px] text-faint">
          <span>© 2026 AI Creator Hub</span>
          <span className="font-mono">Built to ship in every language</span>
        </div>
      </div>
    </footer>
  );
}
