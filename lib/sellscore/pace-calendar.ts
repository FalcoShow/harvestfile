// lib/sellscore/pace-calendar.ts
//
// Calendar-disciplined sales pace milestones for corn/soybeans.
// Adapted from Ed Usset's Terry Timer + Purdue hedge-and-roll, adjusted for
// OBBBA + SCO/ECO floor (per Sell Score v1 spec, Section 4.4).
//
// Marketing year for corn/soy: Sept 1 → Aug 31.
// Pace milestones (% of expected production sold by date):
//   Sept 1    0%   (start of MY, harvest beginning)
//   Nov 15   25%
//   Jan 15   40%
//   Mar 15   55%
//   May 15   70%
//   Jul 15   85%
//   Sept 1  100%  (end of MY, all old crop sold)
//
// Wheat (June 1 → May 31) is not in v1 — corn and soybeans only.
// All date math runs in UTC to avoid timezone drift between server and farmer.

export type Crop = 'corn' | 'soybeans';

export type PaceMilestone = {
  date: Date;
  targetPct: number; // 0–100
};

type MilestoneDef = {
  month: number;     // 1–12
  day: number;       // 1–31
  yearOffset: 0 | 1; // 0 = MY-start year, 1 = following calendar year within MY
  targetPct: number;
};

const CORN_SOY_MILESTONES: MilestoneDef[] = [
  { month: 9,  day: 1,  yearOffset: 0, targetPct: 0   }, // Sept 1  (MY start)
  { month: 11, day: 15, yearOffset: 0, targetPct: 25  }, // Nov 15
  { month: 1,  day: 15, yearOffset: 1, targetPct: 40  }, // Jan 15
  { month: 3,  day: 15, yearOffset: 1, targetPct: 55  }, // Mar 15
  { month: 5,  day: 15, yearOffset: 1, targetPct: 70  }, // May 15
  { month: 7,  day: 15, yearOffset: 1, targetPct: 85  }, // Jul 15
  { month: 9,  day: 1,  yearOffset: 1, targetPct: 100 }, // Sept 1 (MY end)
];

/**
 * Returns the start date (Sept 1) of the marketing year that contains `date`.
 */
export function marketingYearStart(_crop: Crop, date: Date): Date {
  // Sept = month index 8 (0-indexed). MY-start year is the date's calendar
  // year if we're already past Sept 1, otherwise the prior calendar year.
  const year =
    date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 8, 1));
}

function milestonesForMarketingYear(crop: Crop, date: Date): PaceMilestone[] {
  const myStart = marketingYearStart(crop, date);
  const myStartYear = myStart.getUTCFullYear();
  return CORN_SOY_MILESTONES.map((m) => ({
    date: new Date(Date.UTC(myStartYear + m.yearOffset, m.month - 1, m.day)),
    targetPct: m.targetPct,
  }));
}

/**
 * Returns the target % of expected production that should be sold by `date`,
 * linearly interpolated between adjacent milestones.
 */
export function getTargetPaceForDate(crop: Crop, date: Date): number {
  const milestones = milestonesForMarketingYear(crop, date);
  const t = date.getTime();

  if (t < milestones[0].date.getTime()) return 0;
  if (t >= milestones[milestones.length - 1].date.getTime()) return 100;

  for (let i = 0; i < milestones.length - 1; i++) {
    const a = milestones[i];
    const b = milestones[i + 1];
    if (t >= a.date.getTime() && t < b.date.getTime()) {
      const span = b.date.getTime() - a.date.getTime();
      const elapsed = t - a.date.getTime();
      return a.targetPct + (b.targetPct - a.targetPct) * (elapsed / span);
    }
  }
  return 0; // unreachable
}

/**
 * Returns the next milestone strictly after `date`, or null if past final.
 */
export function nextMilestone(crop: Crop, date: Date): PaceMilestone | null {
  const milestones = milestonesForMarketingYear(crop, date);
  const t = date.getTime();
  for (const m of milestones) {
    if (m.date.getTime() > t) return m;
  }
  return null;
}

/**
 * Whole days between two dates (positive if `to` > `from`).
 */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Days elapsed since the start of the marketing year containing `date`.
 */
export function daysIntoMarketingYear(crop: Crop, date: Date): number {
  return daysBetween(marketingYearStart(crop, date), date);
}