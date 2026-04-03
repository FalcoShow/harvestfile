// =============================================================================
// HarvestFile — Inngest Client
// lib/inngest/client.ts
//
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
};
