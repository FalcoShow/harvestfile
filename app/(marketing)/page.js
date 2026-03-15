// =============================================================================
// HarvestFile — Homepage
// Phase 6A: Added "Find Your County" search section
//
// The homepage renders:
// 1. HarvestFile hero + calculator + marketing sections (existing)
// 2. County Search Section — bridges to 2,000+ county SEO pages (NEW)
// =============================================================================

import HarvestFile from "@/components/HarvestFile";
import { CountySearchSection } from "@/components/marketing/CountySearchSection";

export default function Home() {
  return (
    <>
      <HarvestFile />
      <CountySearchSection />
    </>
  );
}
