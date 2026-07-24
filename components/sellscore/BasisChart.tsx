// components/sellscore/BasisChart.tsx
// =============================================================================
// HarvestFile Sell Score — Basis Chart (A3, spec §4.1)
//
// Current county basis vs the 3-year same-date norm. Series comes from
// county_basis_history (composed server-side); the norm is the mean of
// the 3-year ±14-day seasonal window (lib/sellscore/seasonal-basis.ts).
//
// TradingView Lightweight Charts v4 (^4.2.3), conventions per the
// archived CommodityDetailCard: dynamic import inside the effect (stays
// out of the server bundle), v4 addAreaSeries API, transparent solid
// background, attributionLogo off, dashed price line for the norm,
// chart.remove() on unmount with a Strict-Mode double-mount guard.
// Touch interactions stay passive — this is a context chart, not a
// trading terminal.
//
// A plain-language summary line renders under the chart so the number
// is readable without interpreting the plot (58+ voice, 18px floor).
// =============================================================================
'use client';

import { useEffect, useRef } from 'react';
import type { BasisChartDisplay } from '@/lib/sellscore/display-types';
import { colors, fonts, formatters, tabularNums } from './_tokens';

interface BasisChartProps {
  basis: BasisChartDisplay;
}

export default function BasisChart({ basis }: BasisChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const disposedRef = useRef(false);

  const hasSeries = basis.series.length >= 2;

  useEffect(() => {
    if (!hasSeries) return;
    const container = containerRef.current;
    if (!container) return;

    disposedRef.current = false;
    let chart: import('lightweight-charts').IChartApi | null = null;

    (async () => {
      const { createChart, ColorType, LineStyle } = await import(
        'lightweight-charts'
      );
      // Strict Mode double-mount guard: effect may have been cleaned up
      // while the dynamic import was in flight.
      if (disposedRef.current || !containerRef.current) return;

      chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(232, 240, 235, 0.50)',
          fontFamily:
            '"Bricolage Grotesque", system-ui, -apple-system, sans-serif',
          fontSize: 13,
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
        },
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
        },
        crosshair: {
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: false, labelVisible: false },
        },
      });

      const series = chart.addAreaSeries({
        lineColor: colors.emerald,
        lineWidth: 2,
        topColor: 'rgba(52, 211, 153, 0.18)',
        bottomColor: 'rgba(52, 211, 153, 0.0)',
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${Math.round(p * 100)}¢`,
          minMove: 0.01,
        },
      });

      series.setData(basis.series);

      if (basis.norm_3yr != null) {
        series.createPriceLine({
          price: basis.norm_3yr,
          color: 'rgba(226, 195, 102, 0.65)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '3-yr norm',
        });
      }

      chart.timeScale().fitContent();
    })();

    return () => {
      disposedRef.current = true;
      if (chart) {
        chart.remove();
        chart = null;
      }
    };
  }, [hasSeries, basis.series, basis.norm_3yr]);

  return (
    <section
      className="px-6 sm:px-10 py-8 sm:py-10"
      style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
    >
      <div
        className="text-[14px] uppercase mb-2"
        style={{
          color: colors.textTertiary,
          letterSpacing: '0.22em',
          fontWeight: 700,
          fontFamily: fonts.body,
        }}
      >
        Basis · {basis.county_label}
      </div>
      <p
        className="text-[16px] mb-6"
        style={{
          color: colors.textTertiary,
          fontFamily: fonts.body,
          fontWeight: 400,
        }}
      >
        Local {basis.crop} basis vs the 3-year norm for this date
      </p>

      {hasSeries ? (
        <>
          <div
            ref={containerRef}
            style={{ height: '220px', width: '100%' }}
            role="img"
            aria-label={buildAriaSummary(basis)}
          />
          <SummaryLine basis={basis} />
        </>
      ) : (
        <p
          className="text-[18px]"
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.body,
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          Basis history is still building for your county. The chart appears
          once a few weeks of observations are in.
        </p>
      )}
    </section>
  );
}

function SummaryLine({ basis }: { basis: BasisChartDisplay }) {
  const currentCents =
    basis.current != null ? Math.round(basis.current * 100) : null;
  const normCents =
    basis.norm_3yr != null ? Math.round(basis.norm_3yr * 100) : null;

  return (
    <p
      className="text-[18px] mt-5"
      style={{
        ...tabularNums,
        color: colors.textSecondary,
        fontFamily: fonts.body,
        fontWeight: 400,
        lineHeight: 1.5,
      }}
    >
      {currentCents != null && (
        <>
          Today{' '}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            {formatters.cents(currentCents)}
          </span>
        </>
      )}
      {currentCents != null && normCents != null && ' · '}
      {normCents != null && (
        <>
          3-yr same-date norm{' '}
          <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
            {formatters.cents(normCents)}
          </span>
        </>
      )}
    </p>
  );
}

function buildAriaSummary(basis: BasisChartDisplay): string {
  const parts = [`${basis.crop} basis history for ${basis.county_label}`];
  if (basis.current != null) {
    parts.push(`today ${Math.round(basis.current * 100)} cents`);
  }
  if (basis.norm_3yr != null) {
    parts.push(`three year norm ${Math.round(basis.norm_3yr * 100)} cents`);
  }
  return parts.join(', ');
}
