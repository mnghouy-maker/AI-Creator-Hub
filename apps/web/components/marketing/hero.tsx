/**
 * The hero — the page's thesis. Shows the flagship video-translation pipeline
 * running live: a canvas waveform (warm input → cool output), the Extract →
 * Transcribe → Translate → Voice → Merge stages advancing, and translated
 * subtitles cycling. Ported from the approved Phase-1 prototype. Respects
 * prefers-reduced-motion (renders a static frame instead of animating).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STAGES = ['Extract', 'Transcribe', 'Translate', 'Voice', 'Merge'];
const SUBS = [
  'សូមស្វាគមន៍មកកាន់ការបង្ហាញផលិតផលថ្មីរបស់យើង។',
  'Welcome to the reveal of our brand-new product.',
  'ようこそ、私たちの新製品の発表へ。',
  'Bienvenue à la présentation de notre nouveau produit.',
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
  }, []);
  return reduced;
}

function Waveform({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    let bars: { base: number; p: number }[] = [];

    const read = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.floor(r.width / 7);
      bars = Array.from({ length: n }, (_, i) => ({
        base: 0.2 + 0.8 * Math.abs(Math.sin(i * 0.5)),
        p: Math.random() * Math.PI * 2,
      }));
    };
    const draw = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      const mid = r.height / 2;
      const split = Math.floor(bars.length * 0.55);
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i]!;
        const amp = reduced ? b.base : b.base * (0.55 + 0.45 * Math.sin(t * 0.05 + b.p));
        const h = Math.max(2, amp * (r.height * 0.42));
        ctx.fillStyle = i < split ? `hsl(${read('--accent')})` : `hsl(${read('--accent-2')})`;
        ctx.globalAlpha = i < split ? 0.9 : 0.85;
        ctx.beginPath();
        ctx.roundRect(i * 7 + 3, mid - h, 3.4, h * 2, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = `hsl(${read('--text')})`;
      ctx.fillRect(split * 7 + 2.5, 6, 1, r.height - 12);
      t++;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    size();
    draw();
    window.addEventListener('resize', size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, [reduced]);
  return (
    <canvas ref={ref} className="h-[84px] w-full rounded-xl border border-border-2 bg-raise" />
  );
}

function StudioPanel() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [sub, setSub] = useState(0);

  useEffect(() => {
    if (reduced) {
      setActive(STAGES.length);
      return;
    }
    const iv = setInterval(() => {
      setActive((a) => {
        if (a >= STAGES.length) {
          setSub((s) => (s + 1) % SUBS.length);
          return 0;
        }
        return a + 1;
      });
    }, 640);
    return () => clearInterval(iv);
  }, [reduced]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
      <div className="flex items-center gap-2 border-b border-border-2 bg-surface-2 px-3.5 py-3">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#F5675A]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#F5C24B]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#4FC57E]" />
        </span>
        <span className="ml-1.5 font-mono text-xs text-faint">launch_teaser.mp4</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-accent-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2" /> translating
        </span>
      </div>
      <div className="grid gap-3.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-xl border border-accent/40 bg-raise px-3 py-2 text-[13px] font-semibold">
            🇺🇸 English
          </span>
          <svg width="26" height="16" viewBox="0 0 26 16" fill="none" className="text-faint">
            <path
              d="M1 8h22m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="rounded-xl border border-accent-2/50 bg-raise px-3 py-2 text-[13px] font-semibold text-accent-2">
            🇰🇭 ខ្មែរ Khmer
          </span>
        </div>
        <Waveform reduced={reduced} />
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map((s, i) => (
            <div key={s} className="text-center">
              <div className="h-[5px] overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: i < active ? '100%' : '0%',
                    background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--accent-2)))',
                  }}
                />
              </div>
              <div className={cnStage(i < active)}>{s}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-accent-2/30 bg-accent-2/10 px-3 py-2.5">
          <span className="rounded bg-accent-2 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#04201c]">
            CC
          </span>
          <span className="text-[13.5px]">{SUBS[sub]}</span>
        </div>
      </div>
    </div>
  );
}

function cnStage(done: boolean) {
  return `mt-1.5 font-mono text-[10px] uppercase tracking-wide ${done ? 'text-accent-2' : 'text-faint'}`;
}

export function Hero() {
  return (
    <section className="grad-hero">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-muted shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_0_3px_hsl(var(--good)/0.25)]" />
            New · Dub any video in 13 languages
          </span>
          <h1 className="mt-5 max-w-[15ch] text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.03] tracking-tight text-balance">
            Your content, in <span className="text-accent-2">every language</span>.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[clamp(16px,2.2vw,19px)] text-muted">
            Upload a video and get it transcribed, translated, subtitled, and re-voiced with natural
            AI speech — then generate the scripts, blogs, and captions to launch it. One studio,
            built for creators who ship daily.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button size="lg">Start creating free →</Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="secondary">
                See how it works
              </Button>
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-[13px] text-faint">
            <span>
              <b className="text-text">4.9/5</b> from 2,300+ creators
            </span>
            <span>
              <b className="text-text">18M+</b> minutes translated
            </span>
            <span>No credit card required</span>
          </div>
        </div>
        <div className="animate-fade-up">
          <StudioPanel />
        </div>
      </div>
    </section>
  );
}
