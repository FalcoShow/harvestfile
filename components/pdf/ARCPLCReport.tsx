// =============================================================================
// HarvestFile — Deploy 6B-final: ARC/PLC Analysis PDF Report
// components/pdf/ARCPLCReport.tsx
//
// FSA-ready printable analysis report generated with @react-pdf/renderer.
// Uses Yoga flexbox layout, automatic page breaks, native SVG charts.
//
// Layout: US Letter (612 × 792pt), 1" margins (72pt), B&W-safe design.
// Font: Bricolage Grotesque (loaded via HTTPS from production CDN).
//
// CRITICAL: Fonts must be loaded via URL, NOT filesystem path.
// On Vercel serverless, public/ files are served by the CDN — they are
// NOT on the function's filesystem. process.cwd() + '/public/...' FAILS.
//
// Sections:
//   Page 1: Header, farm info, recommendation box, comparison matrix
//   Page 2: Historical payments bar chart, county election context
//   Page 3: Methodology, FSA office info, legal disclaimer
//
// Called from: app/api/generate-pdf/route.tsx via renderToBuffer()
// =============================================================================

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Rect,
  Line,
  G,
} from '@react-pdf/renderer';

// ── Font Registration ─────────────────────────────────────────────────────────
// Load static TTFs via HTTPS from the production domain CDN.
// Variable fonts do NOT work with @react-pdf/renderer — must use static instances.
//
// These files live in public/fonts/ and are served by Vercel's CDN at
// https://harvestfile.com/fonts/... — this works in all environments
// (local dev, Vercel preview deploys, production).
const FONT_BASE = 'https://harvestfile.com/fonts';

Font.register({
  family: 'Bricolage',
  fonts: [
    { src: `${FONT_BASE}/BricolageGrotesque-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_BASE}/BricolageGrotesque-SemiBold.ttf`, fontWeight: 600 },
    { src: `${FONT_BASE}/BricolageGrotesque-Bold.ttf`, fontWeight: 700 },
    { src: `${FONT_BASE}/BricolageGrotesque-ExtraBold.ttf`, fontWeight: 800 },
  ],
});

// Disable hyphenation for performance + cleaner text
Font.registerHyphenationCallback((word: string) => [word]);

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReportData {
  // Farm info
  countyName: string;
  stateAbbr: string;
  cropCode: string;
  cropName: string;
  acres: string;
  cropYear: number;

  // Recommendation
  recommendation: string; // 'ARC-CO' | 'PLC' | 'Similar'
  arcPerAcre: number;
  plcPerAcre: number;
  summary?: string;

  // Extended comparison data
  benchmarkYield?: number;
  benchmarkPrice?: number;
  effectiveRefPrice?: number;
  projectedMYA?: number;
  projectedYield?: number;

  // Historical payments (optional — included if available)
  historicalPayments?: Array<{
    year: number;
    arcPayment: number;
    plcPayment: number;
  }>;

  // County election data (optional)
  electionData?: {
    arcPercent: number;
    plcPercent: number;
    totalFarms: number;
    year: number;
  };

  // Generation metadata
  generatedAt: string;
}

// ── Color Constants (B&W printer safe) ────────────────────────────────────────
const C = {
  dark: '#0C1F17',
  green: '#1B4332',
  greenMedium: '#2D6A4F',
  greenLight: '#40916C',
  gold: '#8B7328',        // Darker gold for print contrast
  text: '#1A1A1A',
  textLight: '#4B5563',
  textMuted: '#6B7280',
  border: '#D1D5DB',
  borderLight: '#E5E7EB',
  bgLight: '#F9FAFB',
  bgAccent: '#F0FDF4',
  white: '#FFFFFF',
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Bricolage',
    fontSize: 10,
    color: C.text,
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 54,
  },
  // ── Header ──────────────────────────────────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: C.green,
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: 800,
    color: C.green,
    letterSpacing: -0.5,
  },
  headerMeta: {
    fontSize: 8,
    color: C.textMuted,
    textAlign: 'right',
  },
  // ── Farm Info ───────────────────────────────────────────────────────────
  farmInfoGrid: {
    flexDirection: 'row',
    backgroundColor: C.bgLight,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    gap: 20,
  },
  farmInfoItem: {
    flex: 1,
  },
  farmInfoLabel: {
    fontSize: 8,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  farmInfoValue: {
    fontSize: 12,
    fontWeight: 700,
    color: C.text,
  },
  // ── Recommendation Box ──────────────────────────────────────────────────
  recBox: {
    backgroundColor: C.bgAccent,
    borderWidth: 2,
    borderColor: C.green,
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
  },
  recLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: C.greenMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  recValue: {
    fontSize: 22,
    fontWeight: 800,
    color: C.green,
    marginBottom: 6,
  },
  recSummary: {
    fontSize: 11,
    color: C.textLight,
    lineHeight: 1.5,
  },
  // ── Section Headers ─────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: C.green,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  // ── Tables ──────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.green,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: C.white,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: C.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableCell: {
    fontSize: 10,
    color: C.text,
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: 700,
    color: C.text,
  },
  // ── Comparison Cards ────────────────────────────────────────────────────
  compGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  compCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    padding: 14,
  },
  compCardWinner: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.green,
    borderRadius: 6,
    padding: 14,
    backgroundColor: C.bgAccent,
  },
  compProgram: {
    fontSize: 12,
    fontWeight: 700,
    color: C.green,
    marginBottom: 4,
  },
  compAmount: {
    fontSize: 20,
    fontWeight: 800,
    color: C.text,
    marginBottom: 2,
  },
  compPerAcre: {
    fontSize: 9,
    color: C.textMuted,
  },
  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 54,
    right: 54,
  },
  footerLine: {
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: C.textMuted,
  },
  // ── Disclaimer ──────────────────────────────────────────────────────────
  disclaimer: {
    marginTop: 24,
    padding: 14,
    backgroundColor: C.bgLight,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.textLight,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: C.textMuted,
    lineHeight: 1.6,
  },
  // ── Chart area ──────────────────────────────────────────────────────────
  chartContainer: {
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    padding: 12,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: C.textLight,
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 8,
    color: C.textMuted,
  },
  // ── Election stats ──────────────────────────────────────────────────────
  electionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  electionCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    alignItems: 'center',
  },
  electionPercent: {
    fontSize: 22,
    fontWeight: 800,
    color: C.green,
  },
  electionLabel: {
    fontSize: 9,
    color: C.textMuted,
    marginTop: 2,
  },
});

// ── Helper: Format currency ───────────────────────────────────────────────────
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── SVG Bar Chart Component ───────────────────────────────────────────────────
function PaymentBarChart({ data }: { data: Array<{ year: number; arcPayment: number; plcPayment: number }> }) {
  const chartW = 440;
  const chartH = 140;
  const barW = 18;
  const gap = 6;
  const labelH = 20;
  const maxVal = Math.max(...data.flatMap((d) => [d.arcPayment, d.plcPayment]), 1);

  const groupW = barW * 2 + gap;
  const totalGroupsW = data.length * groupW + (data.length - 1) * 12;
  const startX = (chartW - totalGroupsW) / 2;

  return (
    <Svg width={chartW} height={chartH + labelH + 10} viewBox={`0 0 ${chartW} ${chartH + labelH + 10}`}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = chartH - frac * chartH;
        return (
          <Line
            key={`grid-${frac}`}
            x1={0}
            y1={y}
            x2={chartW}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Y-axis labels */}
      {[0, 0.5, 1].map((frac) => {
        const y = chartH - frac * chartH;
        return (
          <React.Fragment key={`ylab-${frac}`}>
            {/* @ts-ignore — react-pdf Text inside Svg */}
            <G>
              <Rect x={0} y={y - 5} width={1} height={1} fill="transparent" />
            </G>
          </React.Fragment>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = startX + i * (groupW + 12);
        const arcH = maxVal > 0 ? (d.arcPayment / maxVal) * chartH : 0;
        const plcH = maxVal > 0 ? (d.plcPayment / maxVal) * chartH : 0;

        return (
          <G key={`bar-${d.year}`}>
            {/* ARC-CO bar (gold/dark) */}
            <Rect
              x={x}
              y={chartH - arcH}
              width={barW}
              height={Math.max(arcH, 1)}
              fill="#8B7328"
              rx={2}
            />
            {/* PLC bar (green) */}
            <Rect
              x={x + barW + gap}
              y={chartH - plcH}
              width={barW}
              height={Math.max(plcH, 1)}
              fill="#2D6A4F"
              rx={2}
            />
          </G>
        );
      })}

      {/* X-axis baseline */}
      <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#9CA3AF" strokeWidth={1} />
    </Svg>
  );
}

// ── Page Footer (fixed on every page) ─────────────────────────────────────────
function PageFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerLine}>
        <Text style={s.footerText}>HarvestFile.com — ARC/PLC Analysis Report</Text>
        <Text style={s.footerText}>Generated {generatedAt}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={s.footerText}>Data: USDA FSA, NASS | For informational purposes only</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </View>
  );
}

// ── Main Report Component ─────────────────────────────────────────────────────
export function ARCPLCReport({ data }: { data: ReportData }) {
  const {
    countyName,
    stateAbbr,
    cropName,
    acres,
    cropYear,
    recommendation,
    arcPerAcre,
    plcPerAcre,
    summary,
    benchmarkYield,
    effectiveRefPrice,
    projectedMYA,
    historicalPayments,
    electionData,
    generatedAt,
  } = data;

  const winnerLabel = recommendation === 'Similar' ? 'Both Programs Similar' : recommendation;
  const diff = Math.abs(arcPerAcre - plcPerAcre);
  const acresNum = parseInt(String(acres).replace(/,/g, '')) || 0;
  const totalDiff = diff * acresNum;

  const isArcWinner = recommendation === 'ARC-CO';
  const isPlcWinner = recommendation === 'PLC';

  return (
    <Document
      title={`ARC-PLC Analysis - ${countyName} ${stateAbbr} - ${cropName}`}
      author="HarvestFile"
      subject={`ARC/PLC Election Analysis for ${cropYear} Crop Year`}
      creator="HarvestFile.com"
    >
      {/* ═══ PAGE 1: Summary + Comparison ═══════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <PageFooter generatedAt={generatedAt} />

        {/* Header */}
        <View style={s.headerBar}>
          <Text style={s.headerBrand}>HarvestFile</Text>
          <View>
            <Text style={s.headerMeta}>ARC/PLC Election Analysis</Text>
            <Text style={s.headerMeta}>{cropYear} Crop Year</Text>
          </View>
        </View>

        {/* Farm Info Grid */}
        <View style={s.farmInfoGrid}>
          <View style={s.farmInfoItem}>
            <Text style={s.farmInfoLabel}>County</Text>
            <Text style={s.farmInfoValue}>{countyName}, {stateAbbr}</Text>
          </View>
          <View style={s.farmInfoItem}>
            <Text style={s.farmInfoLabel}>Commodity</Text>
            <Text style={s.farmInfoValue}>{cropName}</Text>
          </View>
          <View style={s.farmInfoItem}>
            <Text style={s.farmInfoLabel}>Base Acres</Text>
            <Text style={s.farmInfoValue}>{acres}</Text>
          </View>
          <View style={s.farmInfoItem}>
            <Text style={s.farmInfoLabel}>Analysis Date</Text>
            <Text style={s.farmInfoValue}>{generatedAt}</Text>
          </View>
        </View>

        {/* Recommendation Box */}
        <View style={s.recBox}>
          <Text style={s.recLabel}>HarvestFile Recommendation</Text>
          <Text style={s.recValue}>{winnerLabel}</Text>
          <Text style={s.recSummary}>
            {summary || (
              recommendation === 'Similar'
                ? `ARC-CO and PLC are projected to produce similar payments for ${cropName} in ${countyName}, ${stateAbbr}. ARC-CO projects $${fmt(arcPerAcre)}/acre and PLC projects $${fmt(plcPerAcre)}/acre — a difference of just $${fmt(diff)}/acre.`
                : `${winnerLabel} is projected to pay $${fmt(diff)} more per base acre than ${isArcWinner ? 'PLC' : 'ARC-CO'} for ${cropName} in ${countyName}, ${stateAbbr}. On ${acres} base acres, that is an estimated $${fmt(totalDiff, 0)} difference in total payments.`
            )}
          </Text>
        </View>

        {/* Comparison Cards */}
        <Text style={s.sectionTitle}>Payment Comparison</Text>
        <View style={s.compGrid}>
          <View style={isArcWinner ? s.compCardWinner : s.compCard}>
            <Text style={s.compProgram}>ARC-CO{isArcWinner ? ' ★' : ''}</Text>
            <Text style={s.compAmount}>${fmt(arcPerAcre)}</Text>
            <Text style={s.compPerAcre}>per base acre</Text>
            {acresNum > 0 && (
              <Text style={{ fontSize: 10, fontWeight: 600, color: C.textLight, marginTop: 6 }}>
                ${fmt(arcPerAcre * acresNum * 0.85, 0)} total (85% payment acres)
              </Text>
            )}
          </View>
          <View style={isPlcWinner ? s.compCardWinner : s.compCard}>
            <Text style={s.compProgram}>PLC{isPlcWinner ? ' ★' : ''}</Text>
            <Text style={s.compAmount}>${fmt(plcPerAcre)}</Text>
            <Text style={s.compPerAcre}>per base acre</Text>
            {acresNum > 0 && (
              <Text style={{ fontSize: 10, fontWeight: 600, color: C.textLight, marginTop: 6 }}>
                ${fmt(plcPerAcre * acresNum * 0.85, 0)} total (85% payment acres)
              </Text>
            )}
          </View>
        </View>

        {/* Key Parameters Table */}
        {(benchmarkYield || effectiveRefPrice || projectedMYA) && (
          <>
            <Text style={s.sectionTitle}>Key Parameters</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: '50%' }]}>Parameter</Text>
              <Text style={[s.tableHeaderText, { width: '50%' }]}>Value</Text>
            </View>
            {benchmarkYield && (
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { width: '50%' }]}>Benchmark Yield (Olympic Avg)</Text>
                <Text style={[s.tableCellBold, { width: '50%' }]}>{fmt(benchmarkYield, 1)} bu/acre</Text>
              </View>
            )}
            {effectiveRefPrice && (
              <View style={s.tableRowAlt}>
                <Text style={[s.tableCell, { width: '50%' }]}>Effective Reference Price</Text>
                <Text style={[s.tableCellBold, { width: '50%' }]}>${fmt(effectiveRefPrice)}/bu</Text>
              </View>
            )}
            {projectedMYA && (
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { width: '50%' }]}>Projected MYA Price</Text>
                <Text style={[s.tableCellBold, { width: '50%' }]}>${fmt(projectedMYA)}/bu</Text>
              </View>
            )}
            <View style={s.tableRowAlt}>
              <Text style={[s.tableCell, { width: '50%' }]}>Payment Acres</Text>
              <Text style={[s.tableCellBold, { width: '50%' }]}>85% of base acres ({acresNum > 0 ? fmt(acresNum * 0.85, 0) : '—'} acres)</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { width: '50%' }]}>ARC-CO Payment Cap</Text>
              <Text style={[s.tableCellBold, { width: '50%' }]}>12% of benchmark revenue</Text>
            </View>
            <View style={s.tableRowAlt}>
              <Text style={[s.tableCell, { width: '50%' }]}>PLC Payment Limit</Text>
              <Text style={[s.tableCellBold, { width: '50%' }]}>$155,000 per person</Text>
            </View>
          </>
        )}
      </Page>

      {/* ═══ PAGE 2: Historical Payments + County Elections ═════════════════ */}
      {(historicalPayments && historicalPayments.length > 0) || electionData ? (
        <Page size="LETTER" style={s.page}>
          <PageFooter generatedAt={generatedAt} />

          {/* Historical Payments */}
          {historicalPayments && historicalPayments.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Historical ARC-CO vs PLC Payments</Text>
              <View style={s.chartContainer}>
                <Text style={s.chartTitle}>Payment per Base Acre by Year</Text>
                <PaymentBarChart data={historicalPayments} />
                <View style={s.chartLegend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: '#8B7328' }]} />
                    <Text style={s.legendLabel}>ARC-CO</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: '#2D6A4F' }]} />
                    <Text style={s.legendLabel}>PLC</Text>
                  </View>
                </View>
              </View>

              {/* Historical Data Table */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { width: '25%' }]}>Year</Text>
                <Text style={[s.tableHeaderText, { width: '25%' }]}>ARC-CO ($/acre)</Text>
                <Text style={[s.tableHeaderText, { width: '25%' }]}>PLC ($/acre)</Text>
                <Text style={[s.tableHeaderText, { width: '25%' }]}>Better Choice</Text>
              </View>
              {historicalPayments.map((row, i) => (
                <View key={row.year} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCellBold, { width: '25%' }]}>{row.year}</Text>
                  <Text style={[s.tableCell, { width: '25%' }]}>${fmt(row.arcPayment)}</Text>
                  <Text style={[s.tableCell, { width: '25%' }]}>${fmt(row.plcPayment)}</Text>
                  <Text style={[s.tableCellBold, { width: '25%', color: C.green }]}>
                    {row.arcPayment > row.plcPayment ? 'ARC-CO' : row.plcPayment > row.arcPayment ? 'PLC' : 'Tie'}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* County Election Context */}
          {electionData && (
            <>
              <Text style={s.sectionTitle}>County Election Context — {countyName}, {stateAbbr}</Text>
              <View style={s.electionGrid}>
                <View style={s.electionCard}>
                  <Text style={s.electionPercent}>{fmt(electionData.arcPercent, 1)}%</Text>
                  <Text style={s.electionLabel}>chose ARC-CO</Text>
                </View>
                <View style={s.electionCard}>
                  <Text style={s.electionPercent}>{fmt(electionData.plcPercent, 1)}%</Text>
                  <Text style={s.electionLabel}>chose PLC</Text>
                </View>
                <View style={s.electionCard}>
                  <Text style={[s.electionPercent, { fontSize: 18 }]}>{electionData.totalFarms.toLocaleString()}</Text>
                  <Text style={s.electionLabel}>farms enrolled ({electionData.year})</Text>
                </View>
              </View>
              <Text style={{ fontSize: 9, color: C.textMuted, lineHeight: 1.5 }}>
                Election data reflects {electionData.year} crop year FSA enrollment records for {countyName}, {stateAbbr}.
                County-level election patterns can indicate local agronomic and economic conditions that favor one
                program over the other, but past elections do not guarantee future payment outcomes.
              </Text>
            </>
          )}
        </Page>
      ) : null}

      {/* ═══ PAGE 3 (or 2): Methodology + Disclaimer ═══════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <PageFooter generatedAt={generatedAt} />

        <Text style={s.sectionTitle}>How This Analysis Was Calculated</Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 12 }}>
          This report compares projected ARC-CO and PLC payments for the {cropYear} crop year
          using the methodology established by the Agricultural Improvement Act and updated
          by the 2024 OBBBA (One Big Beautiful Bill Act). Key calculation parameters:
        </Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { width: '35%' }]}>Program</Text>
          <Text style={[s.tableHeaderText, { width: '65%' }]}>Payment Formula</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tableCellBold, { width: '35%' }]}>ARC-CO</Text>
          <Text style={[s.tableCell, { width: '65%', lineHeight: 1.4 }]}>
            Payment = (Guarantee - Actual Revenue) / Guarantee, capped at 12% of Benchmark Revenue.
            Guarantee = 90% of (Benchmark Yield x max(Eff. Ref. Price, Olympic Avg MYA)).
            Payment acres = 85% of base acres.
          </Text>
        </View>
        <View style={s.tableRowAlt}>
          <Text style={[s.tableCellBold, { width: '35%' }]}>PLC</Text>
          <Text style={[s.tableCell, { width: '65%', lineHeight: 1.4 }]}>
            Payment = max(Effective Ref. Price - MYA Price, 0) x Payment Yield x 85% of base acres.
            Subject to $155,000 per-person payment limit under OBBBA.
          </Text>
        </View>

        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginTop: 12, marginBottom: 12 }}>
          OBBBA updates effective for the {cropYear} crop year: ARC-CO guarantee raised to 90% (from 86%),
          ARC-CO payment cap raised to 12% (from 10%), PLC payment limit of $155,000 per person.
          Effective reference prices for {cropYear}: Corn $4.42/bu, Soybeans $10.71/bu, Wheat $6.35/bu.
        </Text>

        <Text style={s.sectionTitle}>Data Sources</Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 6 }}>
          County yields: USDA National Agricultural Statistics Service (NASS) Quick Stats database.
          Benchmark calculations: Olympic average of 5 most recent crop years (excluding high/low).
          MYA price projections: Based on current CME futures and USDA WASDE forecasts.
          Election data: USDA Farm Service Agency county-level enrollment records.
        </Text>

        <Text style={s.sectionTitle}>Next Steps</Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 4 }}>
          1. Review this analysis with your crop insurance agent or farm management advisor.
        </Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 4 }}>
          2. Contact your local FSA county office to confirm your base acres and payment yield.
        </Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 4 }}>
          3. Make your ARC/PLC election during the enrollment window (typically late summer/fall).
        </Text>
        <Text style={{ fontSize: 10, color: C.textLight, lineHeight: 1.6, marginBottom: 4 }}>
          4. Visit harvestfile.com/morning for daily price updates that affect your projected payments.
        </Text>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTitle}>Important Disclaimer</Text>
          <Text style={s.disclaimerText}>
            This analysis is for informational purposes only and does not constitute financial,
            legal, or agricultural advice. Actual ARC-CO and PLC payments depend on final
            Marketing Year Average (MYA) prices and official county yields, which are not
            finalized until after harvest. Projections are based on current market conditions
            and may change. HarvestFile is not affiliated with USDA, FSA, or any government
            agency. Always consult your local FSA county office before making election decisions.
            Contact your FSA office to verify your specific farm data, base acres, and payment
            yields before signing your election form (CCC-110).
          </Text>
        </View>

        {/* HarvestFile branding */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: C.green }}>
            harvestfile.com
          </Text>
          <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 2 }}>
            The free financial co-pilot for every farm decision
          </Text>
        </View>
      </Page>
    </Document>
  );
}
