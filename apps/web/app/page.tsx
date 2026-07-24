/**
 * Placeholder landing route for Phase 2 — proves the web app builds, reads
 * shared config (@hub/shared), and renders with the design tokens. The full
 * marketing site + dashboard (matching the approved prototype) is Phase 5.
 */
import { PLANS, PLAN_ORDER, LANGUAGES } from '@hub/shared';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <span className="font-mono text-xs uppercase tracking-widest text-muted">
        Phase 2 · scaffold
      </span>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">AI Creator Hub</h1>
      <p className="mt-3 text-muted">
        The monorepo is wired. This page reads plans and languages straight from{' '}
        <code className="font-mono text-accent">@hub/shared</code> — proof the shared domain layer
        is connected end to end. The full UI arrives in Phase 5.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted">Plans</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            return (
              <div key={id} className="rounded-xl border border-border bg-surface p-4">
                <div className="font-semibold">{plan.name}</div>
                <div className="text-2xl font-extrabold">${plan.priceMonthly}/mo</div>
                <div className="font-mono text-xs text-accent-2">
                  {plan.monthlyCredits.toLocaleString()} credits / month
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-mono uppercase tracking-wider text-muted">
          {LANGUAGES.length} languages
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <span key={l.code} className="rounded-full border border-border px-3 py-1 text-sm">
              {l.flag} {l.name}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
