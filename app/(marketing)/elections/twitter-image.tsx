// =============================================================================
// HarvestFile — Phase 30 Build 2: Elections Twitter Card Image
// Standalone version (Next.js 14.2 can't resolve re-exported runtime)
// =============================================================================

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ARC/PLC Election Map — HarvestFile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 56px',
          background: 'linear-gradient(145deg, #0a0f0d 0%, #0C1F17 40%, #142B21 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
            Live 2026 Benchmarking · USDA FSA Data
          </span>
        </div>
        <div style={{ fontSize: '56px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.03em', textAlign: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>What is America&nbsp;</span>
          <span style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', backgroundClip: 'text', color: 'transparent' }}>choosing?</span>
        </div>
        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)', marginTop: '16px', textAlign: 'center' }}>
          County-by-county ARC-CO vs PLC election data for 2,000+ farming counties
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '40px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #C9A84C, #E2C366)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#0C1F17' }}>H</div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>HarvestFile</span>
        </div>
      </div>
    ),
    { ...size }
  );
}