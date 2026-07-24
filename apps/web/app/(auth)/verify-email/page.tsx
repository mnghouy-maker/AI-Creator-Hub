/** Confirms an email via the token in the link. Auto-runs on mount and shows
 *  the outcome. Wrapped in Suspense for useSearchParams (Next 15). */
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

function Verifier() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setState('ok'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Verifying your email…</h1>
        </>
      )}
      {state === 'ok' && (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-good" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="mt-2 text-sm text-muted">Your account is fully activated.</p>
          <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-accent">
            Go to dashboard →
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="mx-auto h-10 w-10 text-crit" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-muted">
            Request a fresh verification email from settings.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent">
            ← Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted">Loading…</p>}>
      <Verifier />
    </Suspense>
  );
}
