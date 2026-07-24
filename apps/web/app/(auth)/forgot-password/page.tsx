/** Request a password-reset link. Always shows success (the API is
 *  enumeration-safe and won't reveal whether the email exists). */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for <b className="text-text">{email}</b>, a reset link is on its way.
          The link expires in an hour.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">We&apos;ll email you a secure reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
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
        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-accent">
        ← Back to sign in
      </Link>
    </div>
  );
}
