/**
 * Projects library — search + filter over saved work. Real interactions
 * (search box, type filter, favorite toggle) over sample data; the list swaps to
 * the API's /projects endpoint in Phase 6. Demonstrates the folders/tags/search/
 * favorite surface from the requirements.
 */
'use client';

import { useMemo, useState } from 'react';
import { Search, Star, Plus } from 'lucide-react';
import type { ProjectType } from '@hub/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProjectIcon } from '@/components/app/project-icon';
import { projects } from '@/lib/sample-data';
import { cn } from '@/lib/utils';

const FILTERS: { label: string; value: ProjectType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Video', value: 'video_translate' },
  { label: 'Voice', value: 'voice' },
  { label: 'Script', value: 'script' },
  { label: 'Blog', value: 'blog' },
];

const STATUS_TONE = { processing: 'run', complete: 'ok', queued: 'wait' } as const;
const STATUS_LABEL = { processing: 'Processing', complete: 'Complete', queued: 'Queued' } as const;

export default function ProjectsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectType | 'all'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const list = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === 'all' || p.type === filter) &&
          p.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Everything you&apos;ve created, saved and searchable.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                filter === f.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-faint',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const fav = favorites.has(p.title);
          return (
            <Card
              key={p.title}
              className="p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-start justify-between">
                <ProjectIcon type={p.type} />
                <button
                  onClick={() =>
                    setFavorites((s) => {
                      const next = new Set(s);
                      if (next.has(p.title)) {
                        next.delete(p.title);
                      } else {
                        next.add(p.title);
                      }
                      return next;
                    })
                  }
                  aria-label="Toggle favorite"
                  className="text-faint transition-colors hover:text-warn"
                >
                  <Star className={cn('h-4 w-4', fav && 'fill-warn text-warn')} />
                </button>
              </div>
              <div className="mt-3 font-semibold">{p.title}</div>
              <div className="mt-0.5 font-mono text-[12px] text-faint">{p.typeLabel}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px]">{p.language}</span>
                <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border py-16 text-center text-sm text-faint">
            No projects match your search.
          </div>
        )}
      </div>
    </div>
  );
}
