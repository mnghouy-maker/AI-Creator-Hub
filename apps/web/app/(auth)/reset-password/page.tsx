/** Set a new password using the emailed token. The token comes from the query
 *  string, so the client island is wrapped in Suspense (Next 15 requirement for
 *  useSearchParams during static rendering). */
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'This link is invalid or expired');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted">This reset link is missing its token. Request a new one.</p>
    );
  }
  if (done) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re all set — signing you back in. All other sessions were signed out.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-crit">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent">
        ← Back to sign in
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ResetForm />
    </Suspense>
  );
}
