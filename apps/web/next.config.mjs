/**
 * Next.js config.
 * - output 'standalone': emit a self-contained server bundle for a minimal
 *   production Docker image (only the files the server needs).
 * - @hub/shared is consumed as a compiled package from node_modules (Phase 9),
 *   so no transpilePackages/extensionAlias shims are needed.
 * - Security headers applied at the framework edge (defense in depth alongside
 *   Nginx/Cloudflare in production) — Architecture §6.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
