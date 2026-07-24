/**
 * Next.js config.
 * - transpilePackages: compile the local @hub/shared TS source directly (no
 *   pre-build step needed in dev).
 * - Security headers applied at the framework edge (defense in depth alongside
 *   Nginx/Cloudflare in production) — Architecture §6.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hub/shared'],
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
