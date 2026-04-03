/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── External packages for server components ───────────────────────────
  // Prevents Vercel from misbundling React Email in serverless functions.
  // Required for Inngest drip campaign email rendering.
  experimental: {
    serverComponentsExternalPackages: ['@react-email/components', '@react-email/render'],
  },

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

      // ═══════════════════════════════════════════════════════════════════
      // Build 18 Deploy 6: Tool Consolidation Redirects
      // Surface 1 (Decision Hub) absorbed these standalone tools into
      // /check tabs. 308 permanent (Next.js default for permanent: true)
      // is treated identically to 301 by Google for SEO purposes.
      // Keep these redirects active for minimum 1 year per Google guidance.
      // ═══════════════════════════════════════════════════════════════════
      {
        source: '/elections',
        destination: '/check?tab=elections',
        permanent: true,
      },
      {
        source: '/optimize',
        destination: '/check?tab=optimization',
        permanent: true,
      },
      {
        source: '/payments',
        destination: '/check?tab=historical',
        permanent: true,
      },
      {
        source: '/fba',
        destination: '/check?tab=base-acres',
        permanent: true,
      },
      // SDRP Checker sunset — dairy revenue protection serves a different
      // audience and dilutes focus. Redirect to the main calculator.
      {
        source: '/sdrp',
        destination: '/check',
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
