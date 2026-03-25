/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Image optimization ────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fzduyjxjdcxbdwjlwrpu.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ── Security + performance headers ────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
      {
        source: '/(.*)\\.(ico|svg|png|jpg|jpeg|gif|webp|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────────
  // NOTE: www → non-www redirect is handled by Vercel edge (Domains settings)
  // which is faster than Next.js config redirects. Do NOT add it here.
  async redirects() {
    return [
      // ── Legacy auth route redirects ───────────────────────────────────
      {
        source: '/auth/login',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/auth/signup',
        destination: '/login',
        permanent: true,
      },

      // ── Trailing slash removal ────────────────────────────────────────
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;