// components/sellscore/ScreenHeader.tsx
import type { FarmDisplayContext } from '@/lib/sellscore/display-types';
import { colors, fonts } from './_tokens';

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
          <h1
            className="text-2xl sm:text-[28px] tracking-tight"
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              color: colors.textPrimary,
              letterSpacing: '-0.012em',
            }}
          >
            Good morning, {context.farmer_first_name}.
          </h1>
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
          className="text-[11px] sm:text-xs uppercase shrink-0"
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