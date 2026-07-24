/**
 * Pricing — reads the four plans straight from @hub/shared, so marketing prices
 * can NEVER drift from what billing charges (Architecture §9). Monthly/yearly
 * toggle mirrors the prototype.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, type PlanId } from '@hub/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES: Record<PlanId, string[]> = {
  free: ['All 12 tools', '3 languages', '720p · watermark'],
  pro: ['All 13 languages', 'Premium voices, no watermark', '1080p exports', 'Priority queue'],
  business: ['Everything in Pro', '3 team seats', '4K exports', 'Brand voice presets'],
  agency: ['Everything in Business', '10 seats · white-label', 'API access', 'Priority support'],
};

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div id="pricing" className="grad-hero py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-faint">
            Simple pricing
          </span>
          <h2 className="mt-3 text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-balance">
            Start free. Upgrade when you&apos;re shipping.
          </h2>
          <p className="mt-3 text-muted">
            Every plan includes all tools — higher plans add credits, concurrency, and seats. Cancel
            anytime.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-border bg-surface p-1">
            {(['mo', 'yr'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setYearly(k === 'yr')}
                className={cn(
                  'rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors',
                  (k === 'yr') === yearly ? 'bg-text text-bg' : 'text-muted',
                )}
              >
                {k === 'mo' ? 'Monthly' : 'Yearly'}
                {k === 'yr' && <span className="ml-1 text-accent-2">−20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const price = yearly ? plan.priceYearlyPerMonth : plan.priceMonthly;
            const popular = id === 'pro';
            return (
              <div
                key={id}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card',
                  popular ? 'border-accent shadow-lift' : 'border-border',
                )}
              >
                {popular && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-fg">
                    Most popular
                  </span>
                )}
                <div className="text-[15px] font-bold tracking-tight">{plan.name}</div>
                <div className="mt-1 min-h-[34px] text-[13px] text-faint">{plan.tagline}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[40px] font-extrabold tracking-tight tabular">
                    ${price}
                  </span>
                  <span className="text-[13px] text-faint">
                    /mo{yearly && price > 0 ? ' · billed yearly' : ''}
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-xs text-accent-2">
                  {plan.monthlyCredits.toLocaleString()} credits / month
                </div>
                <ul className="mt-5 grid gap-2.5">
                  {FEATURES[id].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-auto pt-5">
                  <Button variant={popular ? 'primary' : 'secondary'} className="w-full">
                    {id === 'free'
                      ? 'Get started'
                      : id === 'agency'
                        ? 'Talk to sales'
                        : `Choose ${plan.name}`}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
