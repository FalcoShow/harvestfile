// components/sellscore/ScreenHeader.tsx
// =============================================================================
// Sell Score screen header (server-renderable).
//
// M-03 (May 18, 2026) typography pass:
//   - Farm context label bumped from text-[11px] sm:text-xs to
//     text-[14px] sm:text-[15px] for legibility on 58+ readers.
//     Tracked-out caps treatment retained.
// =============================================================================

import type { FarmDisplayContext } from '@/lib/sellscore/display-types';
import { colors, fonts } from './_tokens';
import Greeting from './Greeting';

interface ScreenHeaderProps {
  context: FarmDisplayContext;
}

export default function ScreenHeader({ context }: ScreenHeaderProps) {
  return (
    <header
      className="px-6 sm:px-10 py-8 sm:py-12"
      style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 sm:gap-8">
        <div>
          <Greeting firstName={context.farmer_first_name} />
          <p
            className="text-lg sm:text-xl mt-1.5"
            style={{
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              color: colors.textSecondary,
              fontWeight: 400,
              letterSpacing: '-0.005em',
            }}
          >
            {context.date_label}
          </p>
        </div>

        <div
          className="text-[14px] sm:text-[15px] uppercase shrink-0"
          style={{
            color: colors.textTertiary,
            letterSpacing: '0.18em',
            fontWeight: 600,
            fontFamily: fonts.body,
          }}
        >
          {context.farm_name} · {context.county} County, {context.state}
        </div>
      </div>
    </header>
  );
}
