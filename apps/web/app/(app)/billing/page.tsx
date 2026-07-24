/**
 * Billing page. Shows the current plan, lets the user upgrade (→ Stripe
 * Checkout) or manage/cancel (→ Stripe customer portal), and lists invoices.
 * Reads live subscription state from the API with a graceful "free" fallback for
 * preview. Plan cards come from @hub/shared so prices match billing exactly.
 */
'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, ExternalLink } from 'lucide-react';
import { PLANS, PLAN_ORDER, isUpgrade, type PlanId } from '@hub/shared';
import { billingApi, type Subscription, type Invoice, ApiError } from '@/lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    billingApi
      .subscription()
      .then(setSub)
      .catch(() => setSub(null));
    billingApi
      .invoices()
      .then((r) => setInvoices(r.invoices))
      .catch(() => {});
  }, []);

  const current = sub?.plan ?? 'free';

  async function upgrade(plan: 'pro' | 'business' | 'agency') {
    setBusy(plan);
    setNotice('');
    try {
      const { url } = await billingApi.checkout(plan, yearly ? 'yearly' : 'monthly');
      if (url) window.location.href = url;
    } catch (err) {
      setNotice(
        err instanceof ApiError && err.status === 503
          ? 'Billing isn’t configured in this environment yet.'
          : 'Could not start checkout. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy('portal');
    try {
      const { url } = await billingApi.portal();
      if (url) window.location.href = url;
    } catch {
      setNotice('Billing portal is unavailable in this environment.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">Manage your plan, credits, and invoices.</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
              Current plan
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight">{PLANS[current].name}</span>
              <span className="text-sm text-muted">
                · {PLANS[current].monthlyCredits.toLocaleString()} credits / month
              </span>
            </div>
            {sub?.cancelAtPeriodEnd && (
              <div className="mt-1 text-[13px] text-warn">Cancels at the end of the period.</div>
            )}
          </div>
          {current !== 'free' && (
            <Button variant="secondary" onClick={manage} loading={busy === 'portal'}>
              <CreditCard className="h-4 w-4" /> Manage billing
            </Button>
          )}
        </CardBody>
      </Card>

      {notice && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {notice}
        </div>
      )}

      {/* Plan chooser */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Upgrade</h2>
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          {(['mo', 'yr'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setYearly(k === 'yr')}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                (k === 'yr') === yearly ? 'bg-text text-bg' : 'text-muted',
              )}
            >
              {k === 'mo' ? 'Monthly' : 'Yearly −20%'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        {PLAN_ORDER.filter((p) => p !== 'free').map((id) => {
          const plan = PLANS[id];
          const price = yearly ? plan.priceYearlyPerMonth : plan.priceMonthly;
          const isCurrent = current === id;
          const canUpgrade = isUpgrade(current, id);
          return (
            <div
              key={id}
              className={cn(
                'flex flex-col rounded-2xl border bg-surface p-5 shadow-card',
                id === 'pro' ? 'border-accent' : 'border-border',
              )}
            >
              <div className="text-[15px] font-bold">{plan.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[32px] font-extrabold tracking-tight tabular">${price}</span>
                <span className="text-[13px] text-faint">/mo</span>
              </div>
              <div className="mt-1 font-mono text-xs text-accent-2">
                {plan.monthlyCredits.toLocaleString()} credits / month
              </div>
              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    <Check className="h-4 w-4" /> Current plan
                  </Button>
                ) : (
                  <Button
                    variant={id === 'pro' ? 'primary' : 'secondary'}
                    className="w-full"
                    loading={busy === id}
                    onClick={() => upgrade(id as 'pro' | 'business' | 'agency')}
                  >
                    {canUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardBody>
          {invoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-border-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-mono text-faint">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  <span className="tabular font-semibold">
                    ${(inv.amountCents / 100).toFixed(2)} {inv.currency.toUpperCase()}
                  </span>
                  {inv.pdfUrl ? (
                    <a
                      href={inv.pdfUrl}
                      className="flex items-center gap-1 text-accent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-faint">{inv.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
