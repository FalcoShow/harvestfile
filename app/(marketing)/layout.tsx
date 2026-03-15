// =============================================================================
// HarvestFile — (marketing) Route Group Layout
// Build 2: Light theme + shared header/footer
//
// Wraps all public marketing pages: /, /check, /pricing, /programs/*, etc.
// Sets data-theme="light" so all Tailwind semantic tokens resolve to light values.
// Header is a Server Component with auth-aware CTA (zero FOUC).
// =============================================================================

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="light">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
