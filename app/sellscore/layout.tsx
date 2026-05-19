// app/sellscore/layout.tsx
// =============================================================================
// Sell Score route group layout (M-02, May 18, 2026)
//
// Wraps every page under /sellscore/* with the SellScoreNav top bar.
// Server component by default; SellScoreNav is the client component that
// handles the active-tab highlighting via usePathname().
//
// Note on /sellscore root: the existing /sellscore/page.tsx (1.27 kB per
// the May 18 build output) sits under this layout too. If that root page
// performs a server-side redirect to /sellscore/me, the nav never renders
// for it. If it renders a real page, the nav appears. Either way is fine;
// the wrapper is harmless for redirect cases.
//
// The page-level wrappers in /sellscore/me and /sellscore/settings keep
// their own minHeight:100vh dark backgrounds, so the nav appears as a
// 64px sticky bar above the page content. Total document height becomes
// slightly more than viewport; standard top-nav behavior.
// =============================================================================

import type { ReactNode } from 'react';
import SellScoreNav from '@/components/sellscore/SellScoreNav';

export default function SellScoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <SellScoreNav />
      {children}
    </>
  );
}
