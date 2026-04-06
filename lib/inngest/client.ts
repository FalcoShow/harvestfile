// =============================================================================
// HarvestFile — Inngest Client
// lib/inngest/client.ts
//
// Deploy 4: Added farm-brief event types for 5 AM Farm Brief digest system
// Build 18 Deploy 6B: Added leads/analysis.saved event for enrollment drip
// Phase 19: Added SMS alert event types
// =============================================================================

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'harvestfile',
  name: 'HarvestFile',
});

export type HarvestFileEvents = {
  // ── Existing events ─────────────────────────────────────────────────────
  'app/alert.triggered': {
    data: {
      alertId: string;
      userId: string;
      orgId: string;
      email: string;
      farmerName: string;
      commodity: string;
      currentPrice: number;
      threshold: number;
      condition: 'above' | 'below';
      state: string;
      priceUnit: string;
    };
  };
  'app/user.trial_started': {
    data: {
      userId: string;
      email: string;
      firstName: string;
    };
  };
  'app/user.converted': {
    data: {
      userId: string;
    };
  };

  // ── Phase 19: SMS alert events ──────────────────────────────────────────
  'app/sms.alert.send': {
    data: {
      subscriptionId: string;
      phone: string;
      timezone: string;
      alertType: string;
      commodity?: string;
      currentPrice?: number;
      threshold?: number;
      condition?: string;
      priceUnit?: string;
      message?: string;
    };
  };
  'app/wasde.released': {
    data: {
      summary: string;
      reportDate?: string;
    };
  };
  'app/enrollment.deadline.reminder': {
    data: {
      daysUntil: number;
      deadlineDate: string;
    };
  };

  // ── Deploy 6B: Lead capture → enrollment drip ───────────────────────────
  'leads/analysis.saved': {
    data: {
      leadId: string;
      email: string;
      countyName: string | null;
      stateAbbr: string | null;
      cropCode: string | null;
      acres: string | null;
      recommendation: string | null;
      arcPerAcre: number;
      plcPerAcre: number;
    };
  };

  // ── Deploy 4: 5 AM Farm Brief digest ────────────────────────────────────
  'digest/farm-brief.send': {
    data: {
      subscriberId: string;
      email: string;
      timezoneGroup: string;
      countyFips: string | null;
      countyName: string | null;
      stateAbbr: string | null;
      primaryCrop: string | null;
      preferences: Record<string, unknown>;
      // Shared market data (pre-fetched by cron, passed to worker)
      marketData: {
        corn: { price: number | null; change: number | null; deferred: number | null };
        soybeans: { price: number | null; change: number | null; deferred: number | null };
        wheat: { price: number | null; change: number | null; deferred: number | null };
        fetchedAt: string;
      };
      sendDate: string; // YYYY-MM-DD for idempotency
    };
  };
};
