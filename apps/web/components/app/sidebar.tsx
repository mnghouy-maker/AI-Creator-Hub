/**
 * Dashboard sidebar. Highlights the active route (usePathname). Tools that
 * arrive in Phase 6 render with a subtle "Soon" chip and don't navigate, so the
 * nav is honest about what's live without dead 404 links.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Film,
  AudioWaveform,
  FileText,
  Newspaper,
  Hash,
  FolderTree,
  CalendarDays,
  History,
  CreditCard,
  Settings,
  Plus,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Item = { label: string; icon: typeof Film; href?: string; soon?: boolean };

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
      { label: 'Video Translator', icon: Film, soon: true },
      { label: 'Voice Studio', icon: AudioWaveform, soon: true },
      { label: 'Script Writer', icon: FileText, soon: true },
      { label: 'Blog Writer', icon: Newspaper, soon: true },
      { label: 'Social Tools', icon: Hash, soon: true },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Projects', icon: FolderTree, href: '/projects' },
      { label: 'Calendar', icon: CalendarDays, soon: true },
      { label: 'History', icon: History, soon: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Billing', icon: CreditCard, soon: true },
      { label: 'Settings', icon: Settings, soon: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-surface px-3.5 py-4 lg:block">
      <div className="px-2 pb-4">
        <Logo href="/dashboard" />
      </div>
      <Button className="mb-4 w-full">
        <Plus className="h-4 w-4" /> New project
      </Button>

      {groups.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            {g.title}
          </div>
          {g.items.map((item) => {
            const active = item.href && pathname === item.href;
            const content = (
              <>
                <item.icon className="h-[17px] w-[17px] shrink-0" />
                <span>{item.label}</span>
                {item.soon && (
                  <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-faint">
                    Soon
                  </span>
                )}
              </>
            );
            const base =
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors';
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  base,
                  active
                    ? 'bg-accent/12 text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                {content}
              </Link>
            ) : (
              <div key={item.label} className={cn(base, 'cursor-default text-faint')}>
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
