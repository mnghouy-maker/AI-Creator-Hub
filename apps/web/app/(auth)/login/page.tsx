/**
 * Login. Two-step: password first; if the account has 2FA, the API returns a
 * ticket and we render the 6-digit code step (matching the API's flow). On
 * success the session cookie is set by the API and we go to the dashboard.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { OAuthButtons } from '@/components/marketing/oauth-buttons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.twoFactorRequired && res.ticket) setTicket(res.ticket);
      else router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.twoFactorLogin({ ticket: ticket!, code });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  if (ticket) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Two-factor authentication</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={submitCode} className="mt-6 space-y-4">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-[0.4em]"
            autoFocus
          />
          {error && <p className="text-sm text-crit">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Verify & sign in
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to your studio.</p>

      <div className="mt-6">
        <OAuthButtons />
      </div>
      <div className="my-5 flex items-center gap-3 text-[13px] text-faint">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submitPassword} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-[13px] font-medium text-accent">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-crit">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link href="/register" className="font-semibold text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
