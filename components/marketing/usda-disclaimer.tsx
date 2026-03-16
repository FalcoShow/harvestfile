// =============================================================================
// HarvestFile — USDA Data Disclaimer (Reusable Component)
// Phase 8C Build 3: Legal compliance
//
// Three variants:
//   "calculator" — for /check and dashboard calculator (estimate focus)
//   "county"     — for county ARC/PLC data pages (data source focus)
//   "compact"    — for election map and tight spaces (one-liner)
//
// Usage:
//   import { UsdaDisclaimer } from '@/components/marketing/usda-disclaimer';
//   <UsdaDisclaimer variant="calculator" />
// =============================================================================

import Link from 'next/link';

interface UsdaDisclaimerProps {
  variant?: 'calculator' | 'county' | 'compact';
  className?: string;
}

export function UsdaDisclaimer({ variant = 'compact', className = '' }: UsdaDisclaimerProps) {
  if (variant === 'calculator') {
    return (
      <div className={`rounded-xl border border-amber-500/10 bg-amber-500/[0.03] px-5 py-4 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="text-amber-500/60 text-sm mt-0.5">⚠️</span>
          <div className="space-y-2 text-[12.5px] leading-relaxed text-foreground/40">
            <p>
              <span className="font-semibold text-foreground/55">Estimates only.</span>{' '}
              All payment calculations are estimates based on current USDA NASS data and OBBBA (2025 Farm Bill) program rules.
              Actual payments are determined solely by the Farm Service Agency and may differ due to final MYA prices,
              official county yields, trend adjustments, and other factors.
            </p>
            <p>
              HarvestFile is not affiliated with USDA, FSA, or NASS. This is not financial, legal, or agricultural advice.
              Always consult your{' '}
              <a
                href="https://www.fsa.usda.gov/contact-us/fsa-offices"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/50 underline underline-offset-2 hover:text-foreground/70 transition-colors"
              >
                local FSA office
              </a>{' '}
              for official calculations and enrollment decisions.{' '}
              <Link href="/terms" className="text-foreground/50 underline underline-offset-2 hover:text-foreground/70 transition-colors">
                Full terms
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'county') {
    return (
      <div className={`rounded-xl border border-border/50 bg-surface/30 px-5 py-4 ${className}`}>
        <div className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground/70">Data source:</span>{' '}
            USDA NASS Quick Stats API and FSA published program data. Updated for OBBBA (Pub. L. 119-21) program parameters.
            County yield data may not reflect the most recent crop year.
            Payment estimates are illustrative and should not be relied upon for enrollment decisions.
          </p>
          <p>
            HarvestFile is not affiliated with, endorsed by, or connected to USDA, FSA, NASS, or any government agency.{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground/70 transition-colors">
              Terms of Service
            </Link>{' '}
            ·{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground/70 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // compact variant — single line for tight spaces
  return (
    <p className={`text-[11px] text-muted-foreground/50 ${className}`}>
      Data sourced from USDA NASS &amp; FSA. Not endorsed by or affiliated with USDA/FSA.
      Estimates only — not financial advice.{' '}
      <Link href="/terms" className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors">
        Terms
      </Link>
    </p>
  );
}
