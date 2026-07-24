/**
 * Admin · Users — search, change roles, and grant support credits. Every action
 * hits the role-gated /admin API and is audit-logged server-side. Sample rows
 * render in preview when the API is unreachable.
 */
'use client';

import { useEffect, useState } from 'react';
import { Search, Gift } from 'lucide-react';
import { adminApi, type AdminUser } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SAMPLE: AdminUser[] = [
  {
    id: '1',
    email: 'makara@example.com',
    name: 'Makara',
    role: 'USER',
    createdAt: new Date().toISOString(),
    emailVerified: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'lina@northwind.co',
    name: 'Lina Kim',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    emailVerified: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'sam@studio.io',
    name: 'Sam R.',
    role: 'USER',
    createdAt: new Date().toISOString(),
    emailVerified: null,
  },
];

const ROLES: AdminUser['role'][] = ['USER', 'ADMIN', 'SUPERADMIN'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(SAMPLE);
  const [query, setQuery] = useState('');

  const load = (q?: string) =>
    adminApi
      .users(q)
      .then((r) => setUsers(r.users))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id: string, role: AdminUser['role']) {
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    try {
      await adminApi.setRole(id, role);
    } catch {
      load(query);
    }
  }

  async function grant(id: string) {
    const amount = Number(window.prompt('Grant how many credits?', '500'));
    if (!amount || amount <= 0) return;
    try {
      await adminApi.grantCredits(id, amount, 'Admin grant');
      window.alert(`Granted ${amount} credits.`);
    } catch {
      window.alert('Could not grant credits (API unavailable in preview).');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[25px] font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted">Manage roles and support credits.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <Card>
        <CardBody className="p-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">
                  <th className="px-3.5 pb-3">User</th>
                  <th className="px-3.5 pb-3">Role</th>
                  <th className="px-3.5 pb-3">Verified</th>
                  <th className="px-3.5 pb-3">Joined</th>
                  <th className="px-3.5 pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border-2 text-[13.5px]">
                    <td className="px-3.5 py-3">
                      <div className="font-semibold">{u.name ?? '—'}</div>
                      <div className="text-[12px] text-faint">{u.email}</div>
                    </td>
                    <td className="px-3.5 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as AdminUser['role'])}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-[13px]"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5 py-3">
                      {u.emailVerified ? (
                        <span className="text-good">✓</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[12.5px] text-faint">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => grant(u.id)}>
                        <Gift className="h-3.5 w-3.5" /> Grant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
