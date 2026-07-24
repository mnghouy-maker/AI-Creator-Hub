/**
 * Command palette (⌘K / Ctrl-K) — the "premium SaaS" navigation affordance from
 * the brief. Keyboard-first: open with the shortcut, filter, arrow to move,
 * Enter to run. Actions are stubbed to routes/tools; Phase 6 wires the tools.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Film, FileText, Newspaper, LayoutGrid, FolderTree } from 'lucide-react';

type Command = { label: string; hint: string; icon: typeof Film; run: () => void };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      {
        label: 'Go to Dashboard',
        hint: 'Navigate',
        icon: LayoutGrid,
        run: () => router.push('/dashboard'),
      },
      {
        label: 'Open Projects',
        hint: 'Navigate',
        icon: FolderTree,
        run: () => router.push('/projects'),
      },
      { label: 'Translate a video', hint: 'Tool · soon', icon: Film, run: () => {} },
      { label: 'Write a script', hint: 'Tool · soon', icon: FileText, run: () => {} },
      { label: 'Write a blog post', hint: 'Tool · soon', icon: Newspaper, run: () => {} },
    ],
    [router],
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    // Lets the topbar search button open the palette too.
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border-2 px-4">
          <Search className="h-4 w-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, filtered.length - 1));
              if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
              if (e.key === 'Enter' && filtered[index]) {
                filtered[index]!.run();
                setOpen(false);
              }
            }}
            placeholder="Search projects, tools, languages…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-faint">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-faint">No matches</div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.label}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                c.run();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                i === index ? 'bg-surface-2 text-text' : 'text-muted'
              }`}
            >
              <c.icon className="h-4 w-4" />
              <span className="font-medium">{c.label}</span>
              <span className="ml-auto font-mono text-[11px] text-faint">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
