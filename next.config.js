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
  // Execution order: headers → redirects → middleware → rewrites
  // These run BEFORE middleware, at the routing layer with zero latency.
  async redirects() {
    return [
      // ── WWW → non-WWW canonical redirect ──────────────────────────────
      // CRITICAL for SEO: stops Google from splitting crawl signals
      // between www.harvestfile.com and harvestfile.com.
      // GSC is registered for https://harvestfile.com/ (non-www).
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.harvestfile.com',
          },
        ],
        destination: 'https://harvestfile.com/:path*',
        permanent: true,
      },

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
