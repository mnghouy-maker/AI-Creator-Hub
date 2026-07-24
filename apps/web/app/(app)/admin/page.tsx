/**
 * Admin overview — revenue + usage at a glance, the processing queue, and
 * feature-flag toggles. Reads from the role-gated /admin API (a normal user
 * gets 403). Shows sample figures if the API is unreachable in preview.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, DollarSign, TrendingUp, CreditCard, Activity } from 'lucide-react';
import { adminApi, type AdminMetrics, type AdminJob, type FeatureFlag } from '@/lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SAMPLE_METRICS: AdminMetrics = {
  totalUsers: 4821,
  newUsersToday: 37,
  activePaidSubs: 612,
  planCounts: { pro: 421, business: 138, agency: 53 },
  mrrCents: 2_148_700,
  lifetimeRevenueCents: 18_940_000,
  jobs: { COMPLETED: 12840, PROCESSING: 6, QUEUED: 3, FAILED: 41 },
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const JOB_TONE: Record<string, 'ok' | 'run' | 'wait' | 'fail'> = {
  COMPLETED: 'ok',
  PROCESSING: 'run',
  QUEUED: 'wait',
  FAILED: 'fail',
};

export default function AdminPage() {
  const [m, setM] = useState<AdminMetrics>(SAMPLE_METRICS);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    adminApi
      .metrics()
      .then(setM)
      .catch(() => {});
    adminApi
      .jobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => {});
    adminApi
      .flags()
      .then((r) => setFlags(r.flags))
      .catch(() => {});
  }, []);

  async function toggle(key: string, enabled: boolean) {
    setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled } : x)));
    try {
      await adminApi.setFlag(key, enabled);
    } catch {
      setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled: !enabled } : x)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted">Revenue, users, and system health.</p>
        </div>
        <Link href="/admin/users" className="text-sm font-semibold text-accent">
          Manage users →
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi
          icon={DollarSign}
          label="MRR"
          value={money(m.mrrCents)}
          sub={`${m.activePaidSubs} paid subs`}
        />
        <Kpi icon={TrendingUp} label="Lifetime revenue" value={money(m.lifetimeRevenueCents)} />
        <Kpi
          icon={Users}
          label="Total users"
          value={m.totalUsers.toLocaleString()}
          sub={`+${m.newUsersToday} today`}
        />
        <Kpi
          icon={Activity}
          label="Jobs processing"
          value={(m.jobs.PROCESSING ?? 0).toLocaleString()}
          sub={`${m.jobs.FAILED ?? 0} failed`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Plan breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by plan</CardTitle>
            <CreditCard className="h-4 w-4 text-faint" />
          </CardHeader>
          <CardBody className="space-y-3">
            {(['pro', 'business', 'agency'] as const).map((plan) => {
              const count = m.planCounts[plan] ?? 0;
              const pct = m.activePaidSubs ? Math.round((count / m.activePaidSubs) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium capitalize">{plan}</span>
                    <span className="font-mono text-faint">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Feature flags */}
        <Card>
          <CardHeader>
            <CardTitle>Feature flags</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1">
            {flags.length === 0 && (
              <p className="py-4 text-center text-sm text-faint">No flags configured.</p>
            )}
            {flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-mono text-[13px]">{f.key}</div>
                  {f.description && <div className="text-[12px] text-faint">{f.description}</div>}
                </div>
                <button
                  role="switch"
                  aria-checked={f.enabled}
                  onClick={() => toggle(f.key, !f.enabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    f.enabled ? 'bg-accent' : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      f.enabled ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Processing queue */}
      <Card>
        <CardHeader>
          <CardTitle>Processing queue — recent jobs</CardTitle>
        </CardHeader>
        <CardBody>
          {jobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">
              No recent jobs (connect the API to see live queue activity).
            </p>
          ) : (
            <div className="divide-y divide-border-2">
              {jobs.slice(0, 12).map((j) => (
                <div key={j.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="font-mono text-faint">{j.action}</span>
                  <span className="ml-auto font-mono text-faint">{j.progress}%</span>
                  <Badge tone={JOB_TONE[j.status] ?? 'neutral'}>{j.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
        <Icon className="h-[15px] w-[15px] text-faint" /> {label}
      </div>
      <div className="mt-2.5 text-[26px] font-extrabold tracking-tight tabular">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-faint">{sub}</div>}
    </Card>
  );
}
