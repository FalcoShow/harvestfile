// components/sellscore/Greeting.tsx
// =============================================================================
// HarvestFile Sell Score — Greeting (client)
//
// Time-of-day-aware greeting computed on the client so it reflects the
// farmer's local time (not Vercel's server region). Defaults to "Good
// morning" during SSR — that matches the 5:30 AM primary use case, so most
// renders need no reconciliation. Afternoon/evening visitors see a brief
// hydration update.
//
// Isolated to one client component so ScreenHeader can stay a server
// component.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { colors, fonts } from './_tokens';

interface GreetingProps {
  firstName: string;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Greeting({ firstName }: GreetingProps) {
  // Default matches primary use case (5:30 AM); reconciles on client mount.
  const [greeting, setGreeting] = useState<string>('Good morning');

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1
      className="text-2xl sm:text-[28px] tracking-tight"
      style={{
        fontFamily: fonts.display,
        fontWeight: 500,
        color: colors.textPrimary,
        letterSpacing: '-0.012em',
      }}
      suppressHydrationWarning
    >
      {greeting}, {firstName}.
    </h1>
  );
}
