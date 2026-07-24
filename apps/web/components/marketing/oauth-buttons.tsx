/**
 * Google / GitHub sign-in buttons. They're plain links to the API's OAuth start
 * routes (a full-page navigation, as OAuth requires) — the API handles the
 * provider handshake and redirects back to /dashboard with a session cookie set.
 */
// Same-origin relative by default (see lib/api.ts); split-origin dev sets it.
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export function OAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href={`${API}/api/auth/google`}
        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold transition-colors hover:border-faint"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
          />
        </svg>
        Google
      </a>
      <a
        href={`${API}/api/auth/github`}
        className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold transition-colors hover:border-faint"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-text">
          <path d="M12 1C5.9 1 1 5.9 1 12c0 4.9 3.2 9 7.6 10.4.6.1.8-.2.8-.5v-1.7c-3.1.7-3.7-1.5-3.7-1.5-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 1.1.9-.2 1.8-.4 2.7-.4.9 0 1.8.1 2.7.4 2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.3.8 1 .8 2.1v3.1c0 .3.2.6.8.5C19.8 21 23 16.9 23 12c0-6.1-4.9-11-11-11z" />
        </svg>
        GitHub
      </a>
    </div>
  );
}
