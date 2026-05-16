/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── External packages for server components / Inngest functions ────────
  // @react-email/components needs to be externalized so Vercel's bundler
  // doesn't misbundle it in serverless functions (fixes "t is not a function")
  // @react-pdf/renderer needs externalization to prevent "PDFDocument is not
  // a constructor" errors in API routes (Deploy 6B-final)
  experimental: {
    serverComponentsExternalPackages: [
      '@react-email/components',
      '@react-email/tailwind',
      '@react-email/render',
      '@react-pdf/renderer',
      '@react-pdf/layout',
      '@react-pdf/pdfkit',
    ],
  },

  // NOTE: outputFileTracingIncludes is a Next.js 15+ feature.
  // On Next.js 14.2.21, font files in public/ are automatically included
  // in Vercel deployments — no extra config needed.

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
      // Build 18 Deploy 6: Tool Consolidation Redirects — Surface 1
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

      // ═══════════════════════════════════════════════════════════════════
      // Phase 1 Migration (May 16, 2026): Sell Score Architecture Cleanup
      //
      // /dashboard sunset — legacy B2B/CRM for insurance agents archived to
      // app/_archive/dashboard/. Authed Sell Score users land on their
      // daily product. Anon users get bounced to /login by middleware on
      // /sellscore/me, which is correct cohesive behavior.
      //
      // /morning sunset — legacy free public dashboard archived to
      // app/_archive/morning/. Its daily-use components (commodity prices,
      // basis tracker, weather forecast) port to /sellscore/markets and a
      // /sellscore/weather widget in Phase 1 build (May 19 → Jul 15 launch).
      //
      // The five Surface 2 redirects (/markets, /grain, /weather, /calendar,
      // /spray-window) previously pointed at /morning. To avoid chained
      // 301s (which Google handles but degrades for SEO), they now point at
      // /advisor — the free public ag intelligence Q&A surface. /advisor
      // handles commodity, weather, grain marketing, USDA timing, and spray
      // window questions in plain English with live data, and surfaces the
      // Sell Score as the personalized upgrade path.
      //
      // See docs/sellscore-migration-plan.md for full Phase 1-4 sequencing.
      // ═══════════════════════════════════════════════════════════════════
      {
        source: '/dashboard',
        destination: '/sellscore/me',
        permanent: true,
      },
      {
        source: '/dashboard/:path*',
        destination: '/sellscore/me',
        permanent: true,
      },
      {
        source: '/morning',
        destination: '/pricing',
        permanent: true,
      },
      {
        source: '/markets',
        destination: '/advisor',
        permanent: true,
      },
      {
        source: '/grain',
        destination: '/advisor',
        permanent: true,
      },
      {
        source: '/weather',
        destination: '/advisor',
        permanent: true,
      },
      {
        source: '/calendar',
        destination: '/advisor',
        permanent: true,
      },
      {
        source: '/spray-window',
        destination: '/advisor',
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
