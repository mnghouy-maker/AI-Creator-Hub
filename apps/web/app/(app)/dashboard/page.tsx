/**
 * Dashboard — the product's home. Assembles: credit meter + stat tiles, the
 * usage chart, latest AI jobs with live progress, a recent-projects table, and
 * quick actions. Greets the signed-in user (client fetch of /auth/me). Numbers
 * are sample data until the aggregate endpoints land (see lib/sample-data.ts).
 */
'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Zap,
  Film,
  Clock,
  FolderOpen,
  TrendingUp,
  AudioWaveform,
  FileText,
  Hash,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UsageChart } from '@/components/app/usage-chart';
import { ProjectIcon } from '@/components/app/project-icon';
import { stats, usageSeries, jobs, projects } from '@/lib/sample-data';

const STATUS_TONE = { processing: 'run', complete: 'ok', queued: 'wait' } as const;
const STATUS_LABEL = { processing: 'Processing', complete: 'Complete', queued: 'Queued' } as const;

export default function DashboardPage() {
  const [name, setName] = useState('Makara');
  useEffect(() => {
    authApi
      .me()
      .then((r) => setName(r.user.name?.split(' ')[0] ?? 'there'))
      .catch(() => {});
  }, []);

  const usedPct = Math.round((stats.creditsRemaining / stats.creditsMonthly) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">Good afternoon, {name} 👋</h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;ve translated <b className="text-text">3 videos</b> this week ·{' '}
            {(stats.creditsMonthly - stats.creditsRemaining).toLocaleString()} of{' '}
            {stats.creditsMonthly.toLocaleString()} monthly credits used.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> New translation
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
            <Zap className="h-[15px] w-[15px] text-faint" /> Credits remaining
          </div>
          <div className="mt-2.5 text-[27px] font-extrabold tracking-tight tabular">
            {stats.creditsRemaining.toLocaleString()}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full"
              style={{
                width: `${usedPct}%`,
                background: 'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--accent-2)))',
              }}
            />
          </div>
          <div className="mt-1.5 text-[12px] text-faint">{usedPct}% of monthly balance left</div>
        </Card>

        <StatTile
          icon={Film}
          label="Videos translated"
          value={stats.videosTranslated}
          delta="▲ 12%"
        />
        <StatTile
          icon={Clock}
          label="Minutes processed"
          value={stats.minutesProcessed}
          delta="▲ 8%"
        />
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
            <FolderOpen className="h-[15px] w-[15px] text-faint" /> Active projects
          </div>
          <div className="mt-2.5 text-[27px] font-extrabold tracking-tight tabular">
            {stats.activeProjects}
          </div>
          <div className="mt-2">
            <Badge tone="run">2 running</Badge>
          </div>
        </Card>
      </div>

      {/* Usage + jobs */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
            <span className="text-[12.5px] font-semibold text-accent">Last 30 days</span>
          </CardHeader>
          <CardBody>
            <UsageChart data={usageSeries} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest AI jobs</CardTitle>
            <span className="cursor-pointer text-[12.5px] font-semibold text-accent">View all</span>
          </CardHeader>
          <CardBody className="grid gap-3.5">
            {jobs.map((j) => (
              <div key={j.name} className="grid gap-2">
                <div className="flex items-center gap-2.5 text-[13.5px]">
                  <ProjectIcon type={j.kind} />
                  <span className="truncate font-semibold">{j.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-faint">
                    {j.status === 'done' ? 'Done' : `${j.progress}%`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${j.progress}%`,
                      background: j.status === 'done' ? 'hsl(var(--good))' : 'hsl(var(--accent))',
                    }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
          <span className="cursor-pointer text-[12.5px] font-semibold text-accent">
            Open library
          </span>
        </CardHeader>
        <div className="overflow-x-auto p-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">
                <th className="whitespace-nowrap px-3.5 pb-3">Project</th>
                <th className="whitespace-nowrap px-3.5 pb-3">Type</th>
                <th className="whitespace-nowrap px-3.5 pb-3">Language</th>
                <th className="whitespace-nowrap px-3.5 pb-3">Status</th>
                <th className="whitespace-nowrap px-3.5 pb-3">Credits</th>
                <th className="whitespace-nowrap px-3.5 pb-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.title} className="border-t border-border-2 text-[13.5px]">
                  <td className="whitespace-nowrap px-3.5 py-3">
                    <span className="flex items-center gap-2.5 font-semibold">
                      <ProjectIcon type={p.type} /> {p.title}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[12.5px] text-faint">
                    {p.typeLabel}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3">{p.language}</td>
                  <td className="whitespace-nowrap px-3.5 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[12.5px] text-faint">
                    −{p.credits}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[12.5px] text-faint">
                    {p.updated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction icon={Film} title="Translate a video" desc="Upload → dub in 13 languages" />
        <QuickAction
          icon={AudioWaveform}
          title="Generate a voiceover"
          desc="Natural AI voices"
          t2
        />
        <QuickAction icon={FileText} title="Write a script" desc="Hooks + full scripts" />
        <QuickAction icon={Hash} title="Caption & hashtags" desc="On-brand social copy" t2 />
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Film;
  label: string;
  value: number;
  delta: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
        <Icon className="h-[15px] w-[15px] text-faint" /> {label}
      </div>
      <div className="mt-2.5 text-[27px] font-extrabold tracking-tight tabular">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[12px] text-good">
        <TrendingUp className="h-3.5 w-3.5" /> {delta}{' '}
        <span className="text-faint">vs last month</span>
      </div>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  title,
  desc,
  t2,
}: {
  icon: typeof Film;
  title: string;
  desc: string;
  t2?: boolean;
}) {
  return (
    <button className="rounded-xl border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lift">
      <span
        className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${
          t2 ? 'bg-accent-2/12 text-accent-2' : 'bg-accent/12 text-accent'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-[12px] text-faint">{desc}</div>
    </button>
  );
}
