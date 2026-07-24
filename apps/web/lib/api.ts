/**
 * Typed API client — the ONLY place the frontend talks to the backend.
 *
 * Design:
 *  - Always sends `credentials: 'include'` so the http-only session cookie rides
 *    along (the frontend never sees or handles the token — Architecture §4.6).
 *  - Throws a typed ApiError on non-2xx so callers can branch on status
 *    (e.g. 401 → redirect to login, 402 → upsell).
 *  - No secrets here; the base URL is the only config, and it's public.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const message =
      (data as { message?: string } | undefined)?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ---- Endpoint-specific typed helpers (extended as phases add routes) -------

export interface Me {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  emailVerified: string | null;
  twoFactorEnabled: boolean;
  referralCode: string;
}

export const authApi = {
  me: () => api.get<{ user: Me }>('/auth/me'),
  register: (body: { email: string; password: string; name?: string; referralCode?: string }) =>
    api.post<{ userId: string }>('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    api.post<{ ok?: boolean; twoFactorRequired?: boolean; ticket?: string }>('/auth/login', body),
  twoFactorLogin: (body: { ticket: string; code: string }) =>
    api.post<{ ok: boolean }>('/auth/2fa/login', body),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  forgotPassword: (email: string) => api.post<{ ok: boolean }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ ok: boolean }>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post<{ verified: boolean }>('/auth/verify-email', { token }),
};
