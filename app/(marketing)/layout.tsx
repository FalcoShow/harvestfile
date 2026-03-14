// =============================================================================
// HarvestFile — (marketing) Route Group Layout
// Phase 4A Step 2, Build 1: Route Group Migration
//
// Wraps all public marketing pages: /, /check, /pricing, /programs/*, etc.
// Build 2 will add: light theme, shared header/footer, auth-aware nav
// =============================================================================

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
