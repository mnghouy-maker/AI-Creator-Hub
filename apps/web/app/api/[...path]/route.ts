/**
 * Same-origin API proxy (BFF).
 *
 * Why this exists: the API sets an http-only, SameSite=Lax session cookie. That
 * cookie is only sent/stored when the browser and API share one origin. On a
 * single-VM deploy, Nginx fronts everything and routes /api → the API, so this
 * handler never runs. But on managed hosts (Render, Railway, …) the web and API
 * get *different* public domains — and *.onrender.com is a public suffix, so
 * those subdomains are cross-site and a Lax cookie will not cross them.
 *
 * So the browser always calls THIS origin's /api/* (lib/api.ts uses a relative
 * base), and we forward the request to the API server-side, passing the cookie
 * through in both directions. First-party cookie, no CORS, works everywhere.
 *
 * The upstream is read at REQUEST time (not baked at build) so the same image
 * works against any API address the platform provides.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side only (never NEXT_PUBLIC_*), so the API address stays out of the
// browser bundle. API_INTERNAL_URL is the platform's internal/public API URL.
// Render's Blueprint `fromService` supplies a bare hostname (no scheme), so we
// default a scheme-less value to https — letting render.yaml auto-wire this from
// the API service with nothing to paste by hand.
function upstreamBase(): string {
  const raw = process.env.API_INTERNAL_URL ?? process.env.API_URL ?? 'http://localhost:4000';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// Hop-by-hop and host-specific headers that must not be forwarded verbatim.
const STRIP = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'transfer-encoding',
]);

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${upstreamBase()}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual', // pass OAuth 302s straight back to the browser
    body: hasBody ? await req.arrayBuffer() : undefined,
  };

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json(
      { message: 'The API is unavailable. Check that the API service is running.' },
      { status: 502 },
    );
  }

  // Rebuild the response, forwarding each Set-Cookie separately (a single
  // Headers copy would comma-join them and corrupt the session cookie).
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'content-encoding') {
      resHeaders.set(key, value);
    }
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    resHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

type Ctx = { params: Promise<{ path: string[] }> };
const handler = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
