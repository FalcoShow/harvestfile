// =============================================================================
// HarvestFile — Phase 25: Dynamic OG Image for County Pages
// Generates a unique 1200x630 social card for each county
// Auto-served at /{state}/{county}/arc-plc/opengraph-image
// =============================================================================

import { ImageResponse } from 'next/og';
import { getCountyBySlug } from '@/lib/data/county-queries';
import { getCountyEnrollmentSummary } from '@/lib/data/historical-enrollment';

export const runtime = 'edge';
export const alt = 'ARC/PLC election data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({
  params,
}: {
  params: Promise<{ state: string; county: string }>;
}) {
  const { state, county } = await params;
  const result = await getCountyBySlug(state, county);

  if (!result) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0C1F17',
            color: '#fff',
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          HarvestFile
        </div>
      ),
      { ...size }
    );
  }

  const { county: c, state: s } = result;
  const enrollment = await getCountyEnrollmentSummary(c.county_fips);

  const arcPct = enrollment?.top_crop_arcco_pct ?? 0;
  const plcPct = enrollment?.top_crop_plc_pct ?? 0;
  const topCrop = enrollment?.top_crop ?? '';
  const latestYear = enrollment?.latest_year ?? '';
  const totalAcres = c.total_base_acres || 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0C1F17',
          padding: '48px 56px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
              }}
            />
            Real USDA Data
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#E2C366',
              letterSpacing: '-0.01em',
            }}
          >
            HarvestFile
          </div>
        </div>

        {/* County Name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 4,
          }}
        >
          {c.display_name}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 40,
          }}
        >
          {s.name} · ARC/PLC Election Data
        </div>

        {/* ARC/PLC Bar */}
        {enrollment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {topCrop} · {latestYear}
            </div>
            <div
              style={{
                display: 'flex',
                height: 40,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${arcPct}%`,
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 16,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                ARC-CO {arcPct}%
              </div>
              <div
                style={{
                  width: `${plcPct}%`,
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 16,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                PLC {plcPct}%
              </div>
            </div>
          </div>
        )}

        {/* Bottom stats */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 'auto',
          }}
        >
          {totalAcres > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {totalAcres >= 1_000_000
                  ? `${(totalAcres / 1_000_000).toFixed(1)}M`
                  : totalAcres >= 1_000
                  ? `${Math.round(totalAcres / 1000)}K`
                  : totalAcres.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Base Acres
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>
              Free
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              ARC/PLC Calculator
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            harvestfile.com/{state}/{county}/arc-plc
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
