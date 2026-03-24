// =============================================================================
// HarvestFile — Phase 30 Build 2: Elections Page OG Image
// app/(marketing)/elections/opengraph-image.tsx
//
// Auto-generates a 1200×630 PNG for social sharing.
// Shows: "What is America choosing?" + national ARC/PLC split bar +
// county count + HarvestFile branding
//
// Next.js file convention: this file auto-registers as the OG image
// for the /elections route. No manual meta tags needed.
// =============================================================================

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ARC/PLC Election Map — See What Every County Chose | HarvestFile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Fetch live national stats
  let arcPct = 70.8;
  let plcPct = 29.2;
  let countyCount = 2663;
  let totalAcres = '246M';

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://harvestfile.com';
    const res = await fetch(`${baseUrl}/api/elections/map?year=2025&commodity=ALL`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.kpi) {
        arcPct = data.kpi.arc_pct || 70.8;
        plcPct = data.kpi.plc_pct || 29.2;
        countyCount = data.kpi.total_counties || 2663;
        const acres = data.kpi.total_acres || 246000000;
        totalAcres = acres >= 1_000_000
          ? `${Math.round(acres / 1_000_000)}M`
          : `${Math.round(acres / 1_000)}K`;
      }
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'linear-gradient(145deg, #0a0f0d 0%, #0C1F17 40%, #142B21 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top: Badge + Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
              }}
            >
              Live 2026 Benchmarking · USDA FSA Data
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            <span>What is America&nbsp;</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              choosing?
            </span>
          </div>
        </div>

        {/* Middle: Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* ARC-CO / PLC Bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                ARC-CO {arcPct}%
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>
                PLC {plcPct}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '24px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${arcPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                }}
              />
              <div
                style={{
                  width: `${plcPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Stats + Branding */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {/* Stats */}
          <div style={{ display: 'flex', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {countyCount.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                }}
              >
                Counties
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {totalAcres}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                }}
              >
                Base Acres
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                16
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                }}
              >
                Commodities
              </span>
            </div>
          </div>

          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #C9A84C, #E2C366)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#0C1F17',
              }}
            >
              H
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              HarvestFile
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
