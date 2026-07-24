// app/sellscore/preview/page.tsx
// =============================================================================
// HarvestFile Sell Score — Preview Page (Internal Design Review Only)
//
// Renders the SellScoreScreen with all four mock scenarios switchable via
// ScenarioToggle. Not linked from navigation. Not indexed. Used to validate
// the screen design before wiring real data into /dashboard.
// =============================================================================

'use client';

import { useState } from 'react';
import type { RecommendationType } from '@/lib/sellscore/types';
import { scenarios } from '@/lib/sellscore/mock-data';
import { colors, fonts } from '@/components/sellscore/_tokens';
import ScenarioToggle from '@/components/sellscore/ScenarioToggle';
import SellScoreScreen from '@/components/sellscore/SellScoreScreen';

export default function SellScorePreviewPage() {
  const [activeScenario, setActiveScenario] = useState<RecommendationType>('sell');
  const data = scenarios[activeScenario];

  return (
    <main
      className="min-h-screen w-full"
      style={{ backgroundColor: colors.pageBg }}
    >
      <div className="px-4 sm:px-8 py-8 sm:py-16">
        <div
          className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${colors.borderSubtle}` }}
        >
          <ScenarioToggle
            active={activeScenario}
            onChange={setActiveScenario}
          />
          <SellScoreScreen data={data} demo />
        </div>

        <PreviewFooter />
      </div>
    </main>
  );
}

function PreviewFooter() {
  return (
    <div
      className="w-full max-w-3xl mx-auto mt-8 text-center"
      style={{ color: colors.textMuted, fontFamily: fonts.body }}
    >
      <p
        className="text-[10px] uppercase"
        style={{ fontWeight: 600, letterSpacing: '0.24em' }}
      >
        HarvestFile Sell Score · Preview build · Mock data only
      </p>
    </div>
  );
}