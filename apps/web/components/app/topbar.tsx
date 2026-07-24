/**
 * Dashboard top bar: command-palette search trigger, live credit balance,
 * theme toggle, and the user menu. Fetches the signed-in user from the API
 * (/auth/me); if that fails (not signed in / API down during a preview) it
 * falls back to a sample identity so the shell still renders.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Zap, LogOut } from 'lucide-react';
import { authApi, ApiError, type Me } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';

const SAMPLE_ME: Me = {
  id: 'sample',
  email: 'demo@aicreatorhub.app',
  name: 'Makara',
  image: null,
  role: 'USER',
  emailVerified: new Date().toISOString(),
  twoFactorEnabled: false,
  referralCode: 'demo',
};

function initials(name: string | null, email: string) {
  const src = name || email;
  return src.slice(0, 2).toUpperCase();
}

export function Topbar({ credits = 1340 }: { credits?: number }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(SAMPLE_ME);

  useEffect(() => {
    authApi
      .me()
      .then((r) => setMe(r.user))
      .catch(() => {
        /* preview mode: keep sample identity */
      });
  }, []);

  async function logout() {
    try {
      await authApi.logout();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    router.push('/login');
  }

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-border bg-bg/80 px-4 py-3.5 backdrop-blur-xl sm:px-6">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="flex max-w-md flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13.5px] text-faint transition-colors hover:border-faint"
      >
        <Search className="h-[15px] w-[15px]" />
        <span className="truncate">Search projects, tools, languages…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 font-mono text-[11px] sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-gradient-to-br from-accent to-accent-2">
          <Zap className="h-3 w-3 text-white" />
        </span>
        <span className="tabular">{credits.toLocaleString()}</span>
        <span className="hidden text-faint sm:inline">credits</span>
      </div>

      <ThemeToggle />

      <div className="group relative">
        <button className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#8a63ff] to-accent text-[13px] font-bold text-white">
          {initials(me.name, me.email)}
        </button>
        <div className="invisible absolute right-0 top-11 w-52 rounded-xl border border-border bg-surface p-1.5 opacity-0 shadow-lift transition-all group-hover:visible group-hover:opacity-100">
          <div className="border-b border-border-2 px-3 py-2">
            <div className="truncate text-sm font-semibold">{me.name ?? 'Creator'}</div>
            <div className="truncate text-[12px] text-muted">{me.email}</div>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
