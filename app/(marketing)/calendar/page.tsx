'use client';

// =============================================================================
// HarvestFile — Policy Paycheck Calendar
// Phase 21C: When Every USDA Payment Hits Your Account
// Free public tool — no signup required
// =============================================================================

import { useState, useMemo, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type EventCategory =
  | 'commodity'
  | 'conservation'
  | 'disaster'
  | 'insurance'
  | 'assistance'
  | 'dairy'
  | 'livestock';

type EventType = 'payment' | 'deadline' | 'window_open' | 'window_close' | 'reporting';

type EventStatus = 'confirmed' | 'estimated' | 'conditional';

interface CalendarEvent {
  id: string;
  program: string;
  programShort: string;
  category: EventCategory;
  eventType: EventType;
  status: EventStatus;
  /** ISO date string YYYY-MM-DD for start of window */
  dateStart: string;
  /** ISO date string YYYY-MM-DD for end of window (same as start for single-day events) */
  dateEnd: string;
  title: string;
  description: string;
  /** Estimated amount or null if variable */
  amount: string | null;
  /** Urgency: how important is this for the farmer */
  urgent: boolean;
  /** Which crop years this applies to */
  cropYear: string;
}

type ViewMode = 'timeline' | 'agenda' | 'quarter';

// ─── Color System ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; border: string; dot: string; chip: string; chipText: string }> = {
  commodity: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    chip: 'bg-blue-100',
    chipText: 'text-blue-700',
  },
  conservation: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100',
    chipText: 'text-emerald-700',
  },
  disaster: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
    chip: 'bg-red-100',
    chipText: 'text-red-700',
  },
  insurance: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    chip: 'bg-purple-100',
    chipText: 'text-purple-700',
  },
  assistance: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    chip: 'bg-amber-100',
    chipText: 'text-amber-700',
  },
  dairy: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    chip: 'bg-sky-100',
    chipText: 'text-sky-700',
  },
  livestock: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    chip: 'bg-orange-100',
    chipText: 'text-orange-700',
  },
};

const EVENT_TYPE_LABELS: Record<EventType, { label: string; icon: string }> = {
  payment: { label: 'Payment', icon: '💰' },
  deadline: { label: 'Deadline', icon: '⚠️' },
  window_open: { label: 'Enrollment Opens', icon: '📋' },
  window_close: { label: 'Enrollment Closes', icon: '🔒' },
  reporting: { label: 'Reporting Due', icon: '📊' },
};

const STATUS_STYLES: Record<EventStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  estimated: { label: 'Estimated', className: 'bg-yellow-100 text-yellow-700' },
  conditional: { label: 'Conditional', className: 'bg-gray-100 text-gray-600' },
};

// ─── Payment Schedule Database ──────────────────────────────────────────────
// Every major USDA program event through 2027, sourced from FSA, NRCS, RMA,
// Federal Register, and OBBBA statutory provisions.

const CALENDAR_EVENTS: CalendarEvent[] = [
  // ── IMMEDIATE DEADLINES (March–April 2026) ─────────────────────────────
  {
    id: 'nap-spring-2026',
    program: 'Noninsured Crop Disaster Assistance',
    programShort: 'NAP',
    category: 'insurance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-03-15',
    dateEnd: '2026-03-15',
    title: 'NAP Application Deadline — Spring Crops',
    description: 'Application deadline for spring-planted crops. Coverage must be purchased before the crop is planted.',
    amount: null,
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'ci-scd-midwest-2026',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-03-15',
    dateEnd: '2026-03-16',
    title: 'Crop Insurance Sales Closing — Corn, Soybeans, Spring Wheat (Midwest)',
    description: 'Last day to purchase or change crop insurance for corn, soybeans, and spring wheat in most Midwest states.',
    amount: null,
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'crp-continuous-batch1',
    program: 'Conservation Reserve Program',
    programShort: 'CRP',
    category: 'conservation',
    eventType: 'window_close',
    status: 'confirmed',
    dateStart: '2026-03-20',
    dateEnd: '2026-03-20',
    title: 'CRP Continuous (Signup 65) — Batching Period 1 Closes',
    description: 'First batching period for Continuous CRP enrollment closes. Offers submitted by this date are evaluated together.',
    amount: null,
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'fba-deadline',
    program: 'Farmer Bridge Assistance',
    programShort: 'FBA',
    category: 'assistance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-04-17',
    dateEnd: '2026-04-17',
    title: 'FBA Application Deadline',
    description: '$12 billion Farmer Bridge Assistance program. Per-acre payments: corn $44.36, soybeans $30.88, wheat $39.35, cotton $117.35. Apply at your FSA office.',
    amount: '$12B total',
    urgent: true,
    cropYear: '2024–2025',
  },
  {
    id: 'crp-general-66',
    program: 'Conservation Reserve Program',
    programShort: 'CRP',
    category: 'conservation',
    eventType: 'window_close',
    status: 'confirmed',
    dateStart: '2026-04-17',
    dateEnd: '2026-04-17',
    title: 'General CRP (Signup 66) Closes',
    description: 'Last day to submit offers for General CRP enrollment. Competitive ranking based on Environmental Benefits Index (EBI).',
    amount: null,
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'sdrp-deadline',
    program: 'Supplemental Disaster Relief Program',
    programShort: 'SDRP',
    category: 'disaster',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-04-30',
    dateEnd: '2026-04-30',
    title: 'SDRP Stage 1 & Stage 2 Application Deadline',
    description: '$16 billion disaster relief for 2023–2024 crop losses. Stage 1: insured losses beyond indemnity. Stage 2: shallow losses, uninsured losses, quality losses.',
    amount: '$16B total',
    urgent: true,
    cropYear: '2023–2024',
  },
  // ── MAY–JULY 2026 ─────────────────────────────────────────────────────
  {
    id: 'corn-final-plant',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-05-31',
    dateEnd: '2026-05-31',
    title: 'Final Planting Date — Corn (Most Midwest States)',
    description: 'Last day to plant corn and maintain full crop insurance coverage. Late planting reduces your guarantee 1% per day.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'soybean-final-plant',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-06-20',
    dateEnd: '2026-06-20',
    title: 'Final Planting Date — Soybeans (Most Midwest States)',
    description: 'Last day to plant soybeans and maintain full crop insurance coverage.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'acreage-reporting',
    program: 'Farm Service Agency',
    programShort: 'FSA',
    category: 'commodity',
    eventType: 'reporting',
    status: 'confirmed',
    dateStart: '2026-07-15',
    dateEnd: '2026-07-15',
    title: 'Acreage Reporting Deadline — Spring/Summer Crops',
    description: 'Universal FSA acreage reporting deadline for all spring and summer planted crops. Required for ARC/PLC, crop insurance, and most FSA programs.',
    amount: null,
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'arc-ic-production',
    program: 'Agriculture Risk Coverage – Individual',
    programShort: 'ARC-IC',
    category: 'commodity',
    eventType: 'reporting',
    status: 'confirmed',
    dateStart: '2026-07-15',
    dateEnd: '2026-07-15',
    title: 'ARC-IC Production Reporting Deadline',
    description: 'Farmers enrolled in ARC-IC must report actual production for the prior crop year by this date.',
    amount: null,
    urgent: false,
    cropYear: '2025',
  },
  // ── AUGUST–SEPTEMBER 2026 ─────────────────────────────────────────────
  {
    id: 'ci-premium-billing',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'estimated',
    dateStart: '2026-08-15',
    dateEnd: '2026-08-15',
    title: 'Crop Insurance Premium Billing Date — Corn/Soybeans',
    description: 'Premium billing date for row crop policies. Premiums are typically due within 30 days of billing.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'arc-plc-election-2026',
    program: 'ARC-CO / PLC Election',
    programShort: 'ARC/PLC',
    category: 'commodity',
    eventType: 'window_open',
    status: 'estimated',
    dateStart: '2026-08-01',
    dateEnd: '2026-11-30',
    title: '2026 ARC/PLC Election & Enrollment Window (Expected)',
    description: 'CRITICAL: Under OBBBA, the 2026 ARC/PLC election is mandatory — no election means zero payment. New base acres being allocated. FSA has indicated significant delays. Window expected late summer/fall 2026.',
    amount: '$13.5B+ projected',
    urgent: true,
    cropYear: '2026',
  },
  {
    id: 'winter-wheat-scd',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-09-30',
    dateEnd: '2026-09-30',
    title: 'Crop Insurance Sales Closing — Winter Wheat (2027)',
    description: 'Last day to purchase or change crop insurance for 2027 winter wheat.',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  {
    id: 'crp-authority-expiry',
    program: 'Conservation Reserve Program',
    programShort: 'CRP',
    category: 'conservation',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-09-30',
    dateEnd: '2026-09-30',
    title: 'CRP Authority Expires (Unless Reauthorized)',
    description: 'Current CRP statutory authority expires September 30, 2026. Congress must pass FFNSA or extend authority for new enrollments.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  // ── OCTOBER 2026 — THE BIG PAYMENT MONTH ──────────────────────────────
  {
    id: 'arc-plc-payment-2025',
    program: 'ARC-CO / PLC Payments',
    programShort: 'ARC/PLC',
    category: 'commodity',
    eventType: 'payment',
    status: 'estimated',
    dateStart: '2026-10-01',
    dateEnd: '2026-11-15',
    title: '2025 Crop Year ARC-CO & PLC Payments',
    description: 'The largest farm program payment of the year. Statute bars payment before October 1. In 2025, FSA processed October 29 with deposits by November 4. OBBBA enhanced reference prices project $13.5B+ total. For 2025 uniquely, farmers receive the HIGHER of ARC-CO or PLC regardless of election.',
    amount: '$13.5B+ total',
    urgent: true,
    cropYear: '2025',
  },
  {
    id: 'crp-annual-2026',
    program: 'Conservation Reserve Program',
    programShort: 'CRP',
    category: 'conservation',
    eventType: 'payment',
    status: 'estimated',
    dateStart: '2026-10-01',
    dateEnd: '2026-10-15',
    title: 'CRP Annual Rental Payments',
    description: 'Annual CRP rental payments process in early-to-mid October. FY2025 payments began October 9, 2024. $1.8B+ to 300,000+ landowners at ~$74/acre national average.',
    amount: '$1.8B+ total',
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'csp-annual-2026',
    program: 'Conservation Stewardship Program',
    programShort: 'CSP',
    category: 'conservation',
    eventType: 'payment',
    status: 'estimated',
    dateStart: '2026-10-01',
    dateEnd: '2027-02-28',
    title: 'CSP Annual Payments (Q1 Fiscal Year)',
    description: 'CSP payments typically arrive in the first quarter of the fiscal year (October–February). Minimum annual payment: $4,000. Maximum: $40,000/year. Participants may delay to January for tax planning.',
    amount: '$4K–$40K/yr',
    urgent: false,
    cropYear: '2026',
  },
  // ── NOVEMBER 2026 ─────────────────────────────────────────────────────
  {
    id: 'harvest-price-2026',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'reporting',
    status: 'estimated',
    dateStart: '2026-11-01',
    dateEnd: '2026-11-05',
    title: 'Harvest Price Announcement — Corn & Soybeans',
    description: 'CBOT average for the month of October sets the harvest price for Revenue Protection policies. This determines whether revenue claims trigger.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'winter-wheat-acreage',
    program: 'Farm Service Agency',
    programShort: 'FSA',
    category: 'commodity',
    eventType: 'reporting',
    status: 'confirmed',
    dateStart: '2026-11-15',
    dateEnd: '2026-11-15',
    title: 'Acreage Reporting — Winter Wheat & Fall Crops',
    description: 'FSA acreage reporting deadline for winter wheat and other fall-planted crops.',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  {
    id: 'ci-indemnity-revenue',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'payment',
    status: 'estimated',
    dateStart: '2026-11-15',
    dateEnd: '2027-01-31',
    title: 'Crop Insurance Indemnity Payments — Individual Revenue Policies',
    description: 'Revenue Protection claims process after harvest price is set and yields are finalized. Individual policy indemnities typically process in 2–8 weeks from claim completion.',
    amount: 'Variable',
    urgent: false,
    cropYear: '2026',
  },
  // ── DECEMBER 2026 ─────────────────────────────────────────────────────
  {
    id: 'elap-lip-lfp-deadline',
    program: 'Emergency Livestock Programs',
    programShort: 'ELAP/LIP/LFP',
    category: 'livestock',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2026-12-31',
    dateEnd: '2026-12-31',
    title: 'ELAP, LIP & LFP — Calendar Year Notice of Loss Deadline',
    description: 'Notice of Loss for ELAP (Emergency Assistance for Livestock, Honey Bees, and Farm-Raised Fish), LIP (Livestock Indemnity Program), and LFP (Livestock Forage Disaster Program) for 2026 calendar year losses.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  // ── JANUARY–MARCH 2027 ────────────────────────────────────────────────
  {
    id: 'dmc-enrollment-2027',
    program: 'Dairy Margin Coverage',
    programShort: 'DMC',
    category: 'dairy',
    eventType: 'window_open',
    status: 'estimated',
    dateStart: '2027-01-01',
    dateEnd: '2027-02-28',
    title: 'DMC 2027 Enrollment Window (Expected)',
    description: 'Dairy Margin Coverage enrollment for the 2027 calendar year. Coverage levels from $4.00–$9.50/cwt. Historically, margins below $9.50 in 48 of 72 months (2018–2024).',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  {
    id: 'eqip-csp-batch-2027',
    program: 'EQIP / CSP National Batching',
    programShort: 'EQIP/CSP',
    category: 'conservation',
    eventType: 'deadline',
    status: 'estimated',
    dateStart: '2027-01-15',
    dateEnd: '2027-01-15',
    title: 'EQIP & CSP National Batching Deadline (Expected)',
    description: 'Applications submitted by this date are evaluated in the first national funding batch. Later applications may still be funded but are lower priority.',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  {
    id: 'elap-lip-lfp-final',
    program: 'Emergency Livestock Programs',
    programShort: 'ELAP/LIP/LFP',
    category: 'livestock',
    eventType: 'deadline',
    status: 'confirmed',
    dateStart: '2027-03-01',
    dateEnd: '2027-03-01',
    title: 'ELAP, LIP & LFP Application Deadline — 2026 Losses',
    description: 'Final application deadline for 2026 calendar year livestock losses.',
    amount: null,
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'ci-scd-midwest-2027',
    program: 'Federal Crop Insurance',
    programShort: 'Crop Ins.',
    category: 'insurance',
    eventType: 'deadline',
    status: 'estimated',
    dateStart: '2027-03-15',
    dateEnd: '2027-03-15',
    title: 'Crop Insurance Sales Closing — Corn, Soybeans, Spring Wheat (2027)',
    description: 'Expected last day to purchase or change 2027 crop insurance for major Midwest row crops.',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  {
    id: 'arc-plc-enrollment-2027',
    program: 'ARC-CO / PLC Enrollment',
    programShort: 'ARC/PLC',
    category: 'commodity',
    eventType: 'deadline',
    status: 'estimated',
    dateStart: '2027-03-15',
    dateEnd: '2027-03-15',
    title: '2027 ARC/PLC Election & Enrollment Deadline (Expected)',
    description: 'Expected deadline for 2027 crop year ARC/PLC election and enrollment. Under OBBBA, elections are annual and mandatory.',
    amount: null,
    urgent: false,
    cropYear: '2027',
  },
  // ── RECURRING / ONGOING EVENTS ────────────────────────────────────────
  {
    id: 'dmc-monthly-payments',
    program: 'Dairy Margin Coverage',
    programShort: 'DMC',
    category: 'dairy',
    eventType: 'payment',
    status: 'conditional',
    dateStart: '2026-03-01',
    dateEnd: '2027-03-31',
    title: 'DMC Monthly Payments (When Triggered)',
    description: 'DMC pays monthly when the national margin falls below your coverage level, with approximately a 2–3 month lag. January margins trigger March payments. Coverage range: $4.00–$9.50/cwt.',
    amount: 'Variable/month',
    urgent: false,
    cropYear: '2026–2027',
  },
  {
    id: 'eqip-rolling',
    program: 'Environmental Quality Incentives Program',
    programShort: 'EQIP',
    category: 'conservation',
    eventType: 'payment',
    status: 'conditional',
    dateStart: '2026-03-01',
    dateEnd: '2027-12-31',
    title: 'EQIP Reimbursement Payments (Rolling)',
    description: 'EQIP payments process 2–6 weeks after NRCS certifies a completed conservation practice. Historically underserved producers can receive 50–100% advance payment before implementation.',
    amount: 'Per practice',
    urgent: false,
    cropYear: '2026–2027',
  },
  {
    id: 'ldp-available',
    program: 'Loan Deficiency Payments',
    programShort: 'LDP',
    category: 'commodity',
    eventType: 'payment',
    status: 'conditional',
    dateStart: '2026-08-01',
    dateEnd: '2027-03-31',
    title: 'LDP Available — 72-Hour Processing via eLDP',
    description: 'When posted county prices fall below the commodity loan rate, Loan Deficiency Payments are available. eLDP system delivers approval and direct deposit within 72 hours.',
    amount: 'Variable',
    urgent: false,
    cropYear: '2026',
  },
  {
    id: 'sco-eco-payments',
    program: 'SCO / ECO Area Crop Insurance',
    programShort: 'SCO/ECO',
    category: 'insurance',
    eventType: 'payment',
    status: 'estimated',
    dateStart: '2027-04-01',
    dateEnd: '2027-09-30',
    title: 'SCO & ECO Area-Based Insurance Payments (2026 Crop)',
    description: 'Area-based policies (SCO, ECO) take 6–12+ months to process because NASS county yields are not finalized until well after harvest. Payments for the 2026 crop year expected spring/summer 2027.',
    amount: 'Variable',
    urgent: false,
    cropYear: '2026',
  },
  // ── FBA PAYMENTS (ACTIVE NOW) ─────────────────────────────────────────
  {
    id: 'fba-payments-rolling',
    program: 'Farmer Bridge Assistance',
    programShort: 'FBA',
    category: 'assistance',
    eventType: 'payment',
    status: 'confirmed',
    dateStart: '2026-02-28',
    dateEnd: '2026-05-31',
    title: 'FBA Payments Processing',
    description: 'FBA payments started hitting accounts February 28, 2026. Payments process within days of application. Apply at your FSA office by April 17.',
    amount: '$44.36/ac corn',
    urgent: true,
    cropYear: '2024–2025',
  },
  // ── SDRP PAYMENTS (ACTIVE NOW) ────────────────────────────────────────
  {
    id: 'sdrp-payments-rolling',
    program: 'Supplemental Disaster Relief Program',
    programShort: 'SDRP',
    category: 'disaster',
    eventType: 'payment',
    status: 'confirmed',
    dateStart: '2025-07-01',
    dateEnd: '2026-06-30',
    title: 'SDRP Payments — Rolling Processing',
    description: '$5.75B+ paid to 388,000+ farmers (Stage 1) since July 2025. Stage 2 opened November 2025. Initial rate: 35% of eligible losses. Apply by April 30, 2026.',
    amount: '$5.75B+ paid',
    urgent: true,
    cropYear: '2023–2024',
  },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonthName(month: number): string {
  return new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

function getMonthShort(month: number): string {
  return new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'short' });
}

// ─── Filter Chip Component ──────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  color,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  color: EventCategory;
  onClick: () => void;
  count: number;
}) {
  const c = CATEGORY_COLORS[color];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
        active
          ? `${c.chip} ${c.chipText} ring-2 ring-offset-1 ring-current`
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? c.dot : 'bg-gray-400'}`} />
      {label}
      <span className={`text-[10px] font-bold ${active ? 'opacity-80' : 'opacity-50'}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Countdown Badge ────────────────────────────────────────────────────────

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const days = getDaysUntil(dateStr);
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
        Passed
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 animate-pulse">
        TODAY
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {days}d left
      </span>
    );
  if (days <= 30)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
        {days}d left
      </span>
    );
  if (days <= 90)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
        {days}d
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
      {days}d
    </span>
  );
}

// ─── Event Card Component ───────────────────────────────────────────────────

function EventCard({ event, expanded, onToggle }: { event: CalendarEvent; expanded: boolean; onToggle: () => void }) {
  const c = CATEGORY_COLORS[event.category];
  const et = EVENT_TYPE_LABELS[event.eventType];
  const st = STATUS_STYLES[event.status];
  const days = getDaysUntil(event.dateStart);
  const isPast = days < 0 && getDaysUntil(event.dateEnd) < 0;
  const isRange = event.dateStart !== event.dateEnd;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        isPast ? 'opacity-50 border-gray-200 bg-gray-50' : `${c.border} ${c.bg} hover:shadow-md`
      } ${expanded ? 'shadow-md' : ''}`}
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Top line: type + program + status */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm">{et.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${c.chipText}`}>
                {event.programShort}
              </span>
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${st.className}`}>
                {st.label}
              </span>
              {event.urgent && !isPast && (
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                  URGENT
                </span>
              )}
            </div>
            {/* Title */}
            <h3 className={`text-sm font-bold leading-snug ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
              {event.title}
            </h3>
            {/* Date line */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                {isRange
                  ? `${formatDateShort(event.dateStart)} — ${formatDateShort(event.dateEnd)}`
                  : formatDate(event.dateStart)}
              </span>
              {event.amount && (
                <span className={`text-xs font-bold ${isPast ? 'text-gray-400' : c.chipText}`}>
                  {event.amount}
                </span>
              )}
            </div>
          </div>
          {/* Countdown */}
          <div className="flex-shrink-0">
            <CountdownBadge dateStr={event.dateStart} />
          </div>
        </div>
        {/* Expanded details */}
        {expanded && (
          <div className={`mt-3 pt-3 border-t ${c.border}`}>
            <p className={`text-xs leading-relaxed ${isPast ? 'text-gray-400' : 'text-gray-700'}`}>
              {event.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <span>Crop Year: {event.cropYear}</span>
              <span>•</span>
              <span>Category: {event.category}</span>
            </div>
          </div>
        )}
      </button>
      {/* Expand indicator */}
      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 transition-transform ${expanded ? 'rotate-180' : ''}`}>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="text-gray-400">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Timeline View ──────────────────────────────────────────────────────────

function TimelineView({ events }: { events: CalendarEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group events by month
  const monthGroups = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const key = e.dateStart.slice(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    // Sort months
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, evts]) => {
        const [y, m] = key.split('-').map(Number);
        return {
          key,
          year: y,
          month: m - 1,
          label: `${getMonthName(m - 1)} ${y}`,
          events: evts.sort((a, b) => a.dateStart.localeCompare(b.dateStart)),
        };
      });
  }, [events]);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="relative">
      {/* Timeline spine */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-blue-300 to-purple-300 rounded-full" />

      {monthGroups.map((group) => {
        const isCurrent = group.key === currentMonthKey;
        return (
          <div key={group.key} className="relative pl-12 mb-8">
            {/* Month marker */}
            <div className="absolute left-0 top-0 flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isCurrent
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {getMonthShort(group.month)}
              </div>
            </div>

            {/* Month header */}
            <div className="mb-3">
              <h3 className={`text-lg font-bold ${isCurrent ? 'text-emerald-800' : 'text-gray-800'}`}>
                {group.label}
              </h3>
              <p className="text-xs text-gray-500">
                {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                {isCurrent && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Current Month
                  </span>
                )}
              </p>
            </div>

            {/* Events for this month */}
            <div className="space-y-2">
              {group.events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  expanded={expandedId === event.id}
                  onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agenda View (Mobile-First) ─────────────────────────────────────────────

function AgendaView({ events }: { events: CalendarEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.dateStart.localeCompare(b.dateStart)),
    [events]
  );

  // Find next upcoming
  const today = new Date().toISOString().slice(0, 10);
  const nextUpIdx = sortedEvents.findIndex((e) => e.dateEnd >= today);

  return (
    <div className="space-y-2">
      {sortedEvents.map((event, idx) => (
        <div key={event.id}>
          {idx === nextUpIdx && (
            <div className="flex items-center gap-2 py-2 px-1">
              <div className="flex-1 h-px bg-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                ▲ Next Up
              </span>
              <div className="flex-1 h-px bg-emerald-400" />
            </div>
          )}
          <EventCard
            event={event}
            expanded={expandedId === event.id}
            onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Quarter View ───────────────────────────────────────────────────────────

function QuarterView({ events }: { events: CalendarEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const quarters = useMemo(() => {
    const qMap: Record<string, { label: string; events: CalendarEvent[] }> = {};
    events.forEach((e) => {
      const [y, m] = e.dateStart.split('-').map(Number);
      const q = Math.ceil(m / 3);
      const key = `${y}-Q${q}`;
      if (!qMap[key])
        qMap[key] = {
          label: `Q${q} ${y} (${getMonthShort((q - 1) * 3)}–${getMonthShort(q * 3 - 1)})`,
          events: [],
        };
      qMap[key].events.push(e);
    });
    return Object.entries(qMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        key,
        ...val,
        events: val.events.sort((a, b) => a.dateStart.localeCompare(b.dateStart)),
      }));
  }, [events]);

  return (
    <div className="space-y-8">
      {quarters.map((q) => (
        <div key={q.key}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-base font-bold text-gray-900">{q.label}</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {q.events.length} events
            </span>
          </div>
          <div className="space-y-2">
            {q.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Upcoming Deadlines Widget ──────────────────────────────────────────────

function UpcomingDeadlines({ events }: { events: CalendarEvent[] }) {
  const deadlines = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter(
        (e) =>
          (e.eventType === 'deadline' || e.eventType === 'window_close') &&
          e.dateEnd >= today
      )
      .sort((a, b) => a.dateStart.localeCompare(b.dateStart))
      .slice(0, 5);
  }, [events]);

  if (deadlines.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-2xl border border-red-200 p-5 mb-6">
      <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Upcoming Deadlines
      </h3>
      <div className="space-y-2">
        {deadlines.map((d) => {
          const days = getDaysUntil(d.dateStart);
          return (
            <div
              key={d.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                days <= 7 ? 'bg-red-100' : days <= 30 ? 'bg-amber-100' : 'bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{d.programShort}</p>
                <p className="text-[10px] text-gray-600 truncate">{d.title}</p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <CountdownBadge dateStr={d.dateStart} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[
        { value: '12+', label: 'Programs Tracked', icon: '📋' },
        { value: '$44B+', label: 'In Payments Covered', icon: '💰' },
        { value: '50+', label: 'Key Dates', icon: '📅' },
        { value: 'Free', label: 'No Signup Required', icon: '✓' },
      ].map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200"
        >
          <span className="text-lg">{s.icon}</span>
          <div>
            <p className="text-base font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function PaycheckCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    new Set<EventCategory>(['commodity', 'conservation', 'disaster', 'insurance', 'assistance', 'dairy', 'livestock'])
  );
  const [showPastEvents, setShowPastEvents] = useState(false);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    setActiveCategories(
      new Set<EventCategory>(['commodity', 'conservation', 'disaster', 'insurance', 'assistance', 'dairy', 'livestock'])
    );
  }, []);

  const filteredEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return CALENDAR_EVENTS.filter((e) => {
      if (!activeCategories.has(e.category)) return false;
      if (!showPastEvents && e.dateEnd < today) return false;
      return true;
    });
  }, [activeCategories, showPastEvents]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const counts: Record<EventCategory, number> = {
      commodity: 0,
      conservation: 0,
      disaster: 0,
      insurance: 0,
      assistance: 0,
      dairy: 0,
      livestock: 0,
    };
    CALENDAR_EVENTS.forEach((e) => {
      if (!showPastEvents && e.dateEnd < today) return;
      counts[e.category]++;
    });
    return counts;
  }, [showPastEvents]);

  // Next payment
  const nextPayment = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return CALENDAR_EVENTS.filter((e) => e.eventType === 'payment' && e.dateStart >= today).sort(
      (a, b) => a.dateStart.localeCompare(b.dateStart)
    )[0];
  }, []);

  // Next deadline
  const nextDeadline = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return CALENDAR_EVENTS.filter(
      (e) =>
        (e.eventType === 'deadline' || e.eventType === 'window_close') &&
        e.dateStart >= today
    ).sort((a, b) => a.dateStart.localeCompare(b.dateStart))[0];
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332]">
        {/* Background grain */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-300 tracking-wide">
              {nextDeadline ? `Next deadline: ${getDaysUntil(nextDeadline.dateStart)} days` : 'Every USDA date in one place'}
            </span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-4 tracking-tight"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            When Every{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">
              USDA Payment
            </span>{' '}
            Hits Your Account
          </h1>

          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            ARC · PLC · CRP · EQIP · SDRP · FBA · DMC · Crop Insurance · LDP — every payment date,
            enrollment deadline, and reporting window through 2027. Free, no signup required.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm">
            {nextPayment && (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">Next Payment:</span>
                <span className="text-white font-semibold">{nextPayment.programShort}</span>
                <span className="text-gray-400">
                  {formatDateShort(nextPayment.dateStart)}
                </span>
              </div>
            )}
            {nextDeadline && (
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-bold">Next Deadline:</span>
                <span className="text-white font-semibold">{nextDeadline.programShort}</span>
                <span className="text-gray-400">
                  {formatDateShort(nextDeadline.dateStart)}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Stats bar */}
        <StatsBar />

        {/* Controls row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* View mode toggle */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            {([
              { key: 'timeline', label: 'Timeline', icon: '⊟' },
              { key: 'agenda', label: 'Agenda', icon: '☰' },
              { key: 'quarter', label: 'Quarterly', icon: '▦' },
            ] as const).map((v) => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === v.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-1.5">{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>

          {/* Past events toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showPastEvents}
              onChange={(e) => setShowPastEvents(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Show past events
          </label>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
          <button
            onClick={selectAllCategories}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
          >
            All
          </button>
          {(
            [
              { key: 'commodity' as const, label: 'ARC/PLC/LDP' },
              { key: 'conservation' as const, label: 'Conservation' },
              { key: 'disaster' as const, label: 'Disaster' },
              { key: 'insurance' as const, label: 'Crop Insurance' },
              { key: 'assistance' as const, label: 'Assistance' },
              { key: 'dairy' as const, label: 'Dairy' },
              { key: 'livestock' as const, label: 'Livestock' },
            ]
          ).map((cat) => (
            <FilterChip
              key={cat.key}
              label={cat.label}
              active={activeCategories.has(cat.key)}
              color={cat.key}
              count={categoryCounts[cat.key]}
              onClick={() => toggleCategory(cat.key)}
            />
          ))}
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main calendar view */}
          <div>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg font-semibold mb-2">No events match your filters</p>
                <p className="text-sm">Try selecting more categories or enabling past events.</p>
              </div>
            ) : viewMode === 'timeline' ? (
              <TimelineView events={filteredEvents} />
            ) : viewMode === 'agenda' ? (
              <AgendaView events={filteredEvents} />
            ) : (
              <QuarterView events={filteredEvents} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Upcoming deadlines widget */}
              <UpcomingDeadlines events={CALENDAR_EVENTS} />

              {/* Color legend */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Program Legend
                </h3>
                <div className="space-y-2">
                  {(
                    [
                      { key: 'commodity' as const, label: 'Commodity (ARC/PLC/LDP)' },
                      { key: 'conservation' as const, label: 'Conservation (CRP/CSP/EQIP)' },
                      { key: 'disaster' as const, label: 'Disaster (SDRP/NAP)' },
                      { key: 'insurance' as const, label: 'Crop Insurance' },
                      { key: 'assistance' as const, label: 'Assistance (FBA)' },
                      { key: 'dairy' as const, label: 'Dairy (DMC)' },
                      { key: 'livestock' as const, label: 'Livestock (ELAP/LIP/LFP)' },
                    ]
                  ).map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[c.key].dot}`} />
                      <span className="text-xs text-gray-700">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status legend */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Status Legend
                </h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_STYLES).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${val.className}`}>
                        {val.label}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {key === 'confirmed'
                          ? 'Date set by USDA/statute'
                          : key === 'estimated'
                          ? 'Based on historical patterns'
                          : 'Depends on market conditions'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0C1F17] via-[#132B1E] to-[#1B4332] py-16 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E2C366]">Personalized</span> Payment Tracking
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Create a free account to get payment estimates based on your actual crops, base acres,
            and program elections. Plus alerts before every deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E2C366] text-[#0C1F17] font-bold text-sm hover:shadow-lg hover:shadow-yellow-500/25 transition-all"
            >
              Create Free Account
            </a>
            <a
              href="/check"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-600 text-gray-300 font-semibold text-sm hover:bg-white/5 transition-all"
            >
              Try ARC/PLC Calculator
            </a>
          </div>
          {/* Cross-links to other tools */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-xs text-gray-500">
            <a href="/check" className="hover:text-gray-300 transition-colors">ARC/PLC Calculator →</a>
            <a href="/payments" className="hover:text-gray-300 transition-colors">Payment Scanner →</a>
            <a href="/fba" className="hover:text-gray-300 transition-colors">FBA Calculator →</a>
            <a href="/sdrp" className="hover:text-gray-300 transition-colors">SDRP Checker →</a>
          </div>
        </div>
      </section>

      {/* ── How This Works ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2
          className="text-xl font-bold text-gray-900 mb-6 text-center"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          How the Payment Calendar Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Filter by Program',
              desc: 'Select which USDA programs you participate in. The calendar shows only the dates relevant to you.',
            },
            {
              step: '2',
              title: 'Track Deadlines',
              desc: 'Countdown badges show exactly how many days until each deadline. Never miss an enrollment window again.',
            },
            {
              step: '3',
              title: 'Plan Your Cash Flow',
              desc: 'Know when every payment arrives so you can make better borrowing, spending, and marketing decisions.',
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mx-auto mb-3">
                {s.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-[10px] text-gray-500 leading-relaxed">
          <p className="font-bold text-gray-600 mb-2 text-xs">Important Disclaimer</p>
          <p>
            Payment dates shown are based on statutory requirements, historical FSA processing patterns,
            and published USDA schedules. Actual payment dates may vary due to FSA processing times,
            government shutdowns, sequestration, or administrative delays. &quot;Estimated&quot; dates are based on
            5+ years of historical patterns and may shift. &quot;Conditional&quot; payments depend on market conditions
            (commodity prices, dairy margins, drought status) and may not trigger in all years. This calendar
            is for informational purposes only and does not constitute financial or legal advice. Contact your
            local FSA, NRCS, or crop insurance agent for definitive program dates. HarvestFile is not
            affiliated with USDA, FSA, NRCS, or RMA. Data sourced from FSA notices, Federal Register
            publications, NRCS program guidance, and RMA bulletins.
          </p>
        </div>
      </section>
    </div>
  );
}
