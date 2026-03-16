// =============================================================================
// HarvestFile — Phase 7B: Dynamic County OG Image
// Generates a unique, data-driven social sharing card for each county page.
//
// When a farmer texts "harvestfile.com/ohio/darke-county/arc-plc" to a neighbor,
// iMessage/Facebook/SMS shows a rich card: "86% of Darke County chose ARC-CO
// for Corn". That's the viral mechanic.
//
// Tech: Next.js App Router opengraph-image.tsx convention + ImageResponse (Satori)
// Size: 1200×630 (universal OG standard)
// Cache: ISR with 24-hour revalidation
// =============================================================================

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCountyEnrollmentSummary } from '@/lib/data/historical-enrollment';
import { getCountyBySlug } from '@/lib/data/county-queries';

// ─── OG Image Config ─────────────────────────────────────────────────────────

export const alt = 'HarvestFile County ARC/PLC Data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400; // 24 hours

// ─── Generate Image ──────────────────────────────────────────────────────────

export default async function Image({
  params,
}: {
  params: Promise<{ state: string; county: string }>;
}) {
  const { state: stateSlug, county: countySlug } = await params;

  // Load font
  let fontData: ArrayBuffer;
  try {
    const fontBuffer = await readFile(
      join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf')
    );
    fontData = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    );
  } catch {
    // Fallback: return a basic branded image without custom font
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0C1F17 0%, #1B4332 100%)',
            color: 'white',
            fontSize: 48,
            fontWeight: 'bold',
          }}
        >
          HarvestFile — ARC/PLC Data
        </div>
      ),
      { ...size }
    );
  }

  // Fetch county data
  const result = await getCountyBySlug(stateSlug, countySlug);
  const summary = result
    ? await getCountyEnrollmentSummary(result.county.county_fips)
    : null;

  // ── No data fallback ───────────────────────────────────────────────────
  if (!result || !summary) {
    const countyDisplay = countySlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const stateDisplay = stateSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 70px',
            background: 'linear-gradient(145deg, #0C1F17 0%, #1B4332 50%, #0C1F17 100%)',
            fontFamily: 'Inter',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#C9A84C',
                textTransform: 'uppercase' as const,
                letterSpacing: '3px',
                marginBottom: '16px',
              }}
            >
              FREE ARC/PLC DATA
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: '16px',
              }}
            >
              {countyDisplay} County
            </div>
            <div
              style={{
                fontSize: 32,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {stateDisplay}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Compare ARC-CO vs PLC payments · Real USDA data
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#C9A84C',
              }}
            >
              harvestfile.com
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [{ name: 'Inter', data: fontData, weight: 700 }],
      }
    );
  }

  // ── Data-rich OG card ──────────────────────────────────────────────────
  const { county, state } = result;
  const arcPct = Math.round(summary.top_crop_arcco_pct);
  const plcPct = 100 - arcPct;
  const totalAcres = Math.round(summary.top_crop_total_acres).toLocaleString();
  const majorityProgram = arcPct >= plcPct ? 'ARC-CO' : 'PLC';
  const majorityPct = Math.max(arcPct, plcPct);

  // Color for the majority bar
  const arcColor = '#10B981'; // emerald-500
  const plcColor = '#3B82F6'; // blue-500

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '50px 64px 44px',
          background: 'linear-gradient(145deg, #0C1F17 0%, #162B22 50%, #0C1F17 100%)',
          fontFamily: 'Inter',
          color: 'white',
        }}
      >
        {/* ── Top: Label + County Name ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#C9A84C',
              textTransform: 'uppercase' as const,
              letterSpacing: '3px',
              marginBottom: '12px',
            }}
          >
            {summary.latest_year} ARC/PLC ENROLLMENT DATA
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {county.display_name} County, {state.abbreviation}
          </div>
        </div>

        {/* ── Middle: Big Number + Bar Chart ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Headline stat */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1,
                color: majorityProgram === 'ARC-CO' ? arcColor : plcColor,
              }}
            >
              {majorityPct}%
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                chose {majorityProgram}
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                for {summary.top_crop} · {totalAcres} base acres
              </div>
            </div>
          </div>

          {/* ARC/PLC split bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '40px',
              borderRadius: '20px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${arcPct}%`,
                height: '100%',
                background: arcColor,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: arcPct > 15 ? '16px' : '4px',
                fontSize: arcPct > 20 ? 16 : 12,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {arcPct > 10 ? `ARC-CO ${arcPct}%` : ''}
            </div>
            <div
              style={{
                width: `${plcPct}%`,
                height: '100%',
                background: plcColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: plcPct > 15 ? '16px' : '4px',
                fontSize: plcPct > 20 ? 16 : 12,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {plcPct > 10 ? `PLC ${plcPct}%` : ''}
            </div>
          </div>

          {/* Secondary crops preview */}
          {summary.crops.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '24px',
                fontSize: 16,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {summary.crops.slice(1, 4).map((crop) => (
                <div key={crop.crop_name} style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {crop.crop_name}:
                  </span>
                  <span
                    style={{
                      color:
                        crop.arcco_pct >= 50
                          ? 'rgba(16,185,129,0.7)'
                          : 'rgba(59,130,246,0.7)',
                    }}
                  >
                    {Math.round(Math.max(crop.arcco_pct, crop.plc_pct))}%{' '}
                    {crop.arcco_pct >= 50 ? 'ARC' : 'PLC'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom: Branding ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Source: USDA FSA Enrolled Base Acres · Updated for OBBBA
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#0C1F17',
              }}
            >
              H
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#C9A84C',
              }}
            >
              harvestfile.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Inter', data: fontData, weight: 700 }],
    }
  );
}
