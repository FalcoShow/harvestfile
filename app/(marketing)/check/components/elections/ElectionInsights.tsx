// =============================================================================
// HarvestFile — Build 18 Deploy 4: Election Insights
// app/(marketing)/check/components/elections/ElectionInsights.tsx
//
// Generates plain-language observations from enrollment data.
// Follows Credit Karma's pattern: distill data into personal, actionable text.
// No AI needed — insights computed deterministically from the data array.
//
// Language is neutral and factual: "How farmers are deciding" not
// "What you should choose." Every stat sourced directly from data.
// =============================================================================

'use client';

interface ElectionYearData {
  programYear: number;
  arccoPct: number;
  plcPct: number;
  arccoAcres: number;
  plcAcres: number;
  totalAcres: number;
}

interface InsightsAPIData {
  dominant: 'ARC-CO' | 'PLC' | 'SPLIT';
  dominantPct: number;
  trendDirection: 'TOWARD_ARC' | 'TOWARD_PLC' | 'STABLE';
  trendShift: number;
  streak: number;
  latestYear: number;
}

interface ElectionInsightsProps {
  data: ElectionYearData[];
  insights: InsightsAPIData | null;
  countyName: string;
}

export default function ElectionInsights({ data, insights, countyName }: ElectionInsightsProps) {
  if (!insights || data.length === 0) return null;

  const latest = data[data.length - 1];
  const arcWinYears = data.filter((d) => d.arccoPct > d.plcPct).length;
  const plcWinYears = data.filter((d) => d.plcPct > d.arccoPct).length;

  // Determine trend description
  let trendText = '';
  if (insights.trendDirection === 'TOWARD_ARC') {
    trendText = `The county has shifted ${insights.trendShift.toFixed(1)} points toward ARC-CO over the past 2 years.`;
  } else if (insights.trendDirection === 'TOWARD_PLC') {
    trendText = `The county has shifted ${insights.trendShift.toFixed(1)} points toward PLC over the past 2 years.`;
  } else {
    trendText = 'The election split has been relatively stable over the past 2 years.';
  }

  return (
    <div className="space-y-4">
      <h4 className="text-[15px] sm:text-[17px] font-extrabold text-white/90 tracking-[-0.01em]">
        How {countyName} farmers are deciding
      </h4>

      {/* Hero stat */}
      <p className="text-[13px] sm:text-[14px] leading-relaxed text-white/50">
        In{' '}
        <strong className="text-white/80">{insights.latestYear}</strong>,{' '}
        <strong
          style={{
            color: insights.dominant === 'ARC-CO' ? '#2DD4BF'
              : insights.dominant === 'PLC' ? '#C9A84C'
              : 'rgba(255,255,255,0.7)',
          }}
        >
          {insights.dominantPct.toFixed(1)}% of enrolled base acres
        </strong>{' '}
        in {countyName} chose {insights.dominant === 'SPLIT' ? 'roughly equal ARC-CO and PLC' : insights.dominant}.
        {insights.streak >= 3 && (
          <> That&apos;s {insights.streak} consecutive years of{' '}
            {latest.arccoPct >= latest.plcPct ? 'ARC-CO' : 'PLC'} dominance.</>
        )}
      </p>

      {/* Historical pattern */}
      <p className="text-[13px] sm:text-[14px] leading-relaxed text-white/50">
        Over {data.length} years of data, ARC-CO led in{' '}
        <strong className="text-[#2DD4BF]">{arcWinYears} year{arcWinYears !== 1 ? 's' : ''}</strong>{' '}
        and PLC led in{' '}
        <strong className="text-[#C9A84C]">{plcWinYears} year{plcWinYears !== 1 ? 's' : ''}</strong>.{' '}
        {trendText}
      </p>

      {/* Acres context */}
      <p className="text-[13px] sm:text-[14px] leading-relaxed text-white/50">
        For {latest.programYear}, that&apos;s{' '}
        <strong className="text-white/70">
          {latest.arccoAcres.toLocaleString()} ARC-CO acres
        </strong>{' '}
        vs{' '}
        <strong className="text-white/70">
          {latest.plcAcres.toLocaleString()} PLC acres
        </strong>{' '}
        out of {latest.totalAcres.toLocaleString()} total enrolled base acres.
      </p>

      {/* Low enrollment warning */}
      {latest.totalAcres < 500 && (
        <div
          className="rounded-lg px-3 py-2 text-[11px] text-[#C9A84C]/70 leading-relaxed"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)' }}
        >
          Low enrollment county — fewer than 500 total base acres. Percentages may not be representative of broader trends.
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-white/20 leading-relaxed italic">
        County trends reflect local conditions but may not match your individual operation. Consult your FSA office or advisor before making your election.
      </p>
    </div>
  );
}
