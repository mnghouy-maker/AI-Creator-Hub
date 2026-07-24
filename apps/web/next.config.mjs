/**
 * Next.js config.
 * - transpilePackages: compile the local @hub/shared TS source directly (no
 *   pre-build step needed in dev).
 * - extensionAlias: @hub/shared uses NodeNext-style `.js` import specifiers
 *   (required so the API/worker compile), which point at `.ts` sources. This
 *   tells webpack to resolve those `.js` specifiers to the real `.ts` files, so
 *   one import style works across bundler + Node without a build step.
 * - Security headers applied at the framework edge (defense in depth alongside
 *   Nginx/Cloudflare in production) — Architecture §6.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hub/shared'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
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
