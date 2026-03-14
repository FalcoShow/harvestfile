// =============================================================================
// HarvestFile - Inngest Client
// Phase 3D: Background job orchestration
// =============================================================================

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'harvestfile',
  name: 'HarvestFile',
});

export type HarvestFileEvents = {
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
};
