// app/sellscore/_components/SellScoreSetupPending.tsx
//
// Server component shown when the user is authenticated but the live
// Sell Score isn't ready for them yet. Three flavors, gated by props:
//
//   1. Default               — account exists, no farm row provisioned
//   2. outsideBeachhead      — farm exists, county outside v1 coverage
//   3. noCropsEnrolled       — farm exists, no engine-supported crops
//
// All three flavors currently route to the same human action: email
// hello@harvestfile.com and get manually provisioned. The beachhead
// case adds a state-named waitlist explanation; the no-crops case
// names what's missing and why. v1.2+ replaces this whole component
// with the /sellscore/setup onboarding flow.
//
// Visual contract: matches the live Sell Score page — same dark page
// background, same card structure with subtle border, same Bricolage
// Grotesque typography stack. Quieter than the live screen because
// this is a transient state, not a primary surface. Most users will
// see it for under 24 hours before being provisioned.

import { colors, fonts } from '@/components/sellscore/_tokens';

interface Props {
  email: string | null;
  /** Set when the farm exists but its county is outside the v1 beachhead. */
  outsideBeachhead?: boolean;
  /** County FIPS for the outside-beachhead flavor (informational). */
  countyFips?: string;
  /** State name for the outside-beachhead waitlist message. */
  state?: string;
  /** Set when the farm exists but no engine-supported crops are enrolled. */
  noCropsEnrolled?: boolean;
  /** Farm name for the no-crops flavor (personalizes the headline). */
  farmName?: string;
}

export default function SellScoreSetupPending({
  email,
  outsideBeachhead,
  countyFips,
  state,
  noCropsEnrolled,
  farmName,
}: Props) {
  const content = pickContent({
    email,
    outsideBeachhead,
    countyFips,
    state,
    noCropsEnrolled,
    farmName,
  });

  return (
    <main
      className="min-h-screen w-full"
      style={{ backgroundColor: colors.pageBg }}
    >
      <div className="px-4 sm:px-8 py-16 sm:py-24">
        <div
          className="w-full max-w-xl mx-auto rounded-2xl"
          style={{
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.cardBg,
            padding: '2.75rem 2rem',
          }}
        >
          <p
            className="text-[10px] uppercase mb-7"
            style={{
              color: colors.textTertiary,
              letterSpacing: '0.24em',
              fontWeight: 700,
              fontFamily: fonts.body,
            }}
          >
            {content.eyebrow}
          </p>

          <h1
            className="text-[28px] sm:text-[32px] mb-7 leading-[1.15]"
            style={{
              fontFamily: fonts.body,
              fontWeight: 600,
              letterSpacing: '-0.018em',
              color: colors.textPrimary,
            }}
          >
            {content.headline}
          </h1>

          <div
            className="space-y-4 text-[15px] leading-relaxed"
            style={{
              fontFamily: fonts.body,
              color: colors.textSecondary,
              fontWeight: 400,
            }}
          >
            {content.body}
          </div>

          <div
            className="mt-8 pt-6"
            style={{
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <a
              href={`mailto:hello@harvestfile.com?subject=${encodeURIComponent(
                content.mailtoSubject,
              )}`}
              className="inline-block px-5 py-3 rounded-md text-[14px]"
              style={{
                fontFamily: fonts.body,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                color: colors.pageBg,
                backgroundColor: BRAND_GOLD,
                textDecoration: 'none',
                minHeight: '48px',
                lineHeight: '24px',
              }}
            >
              Email hello@harvestfile.com
            </a>
            <p
              className="mt-4 text-[12px]"
              style={{
                fontFamily: fonts.body,
                color: colors.textMuted,
                fontWeight: 400,
                letterSpacing: '0.01em',
              }}
            >
              Typical setup time is under 24 hours during business hours.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Content selection
// ─────────────────────────────────────────────────────────────────────────

interface ContentResolution {
  eyebrow: string;
  headline: string;
  body: React.ReactNode;
  mailtoSubject: string;
}

function pickContent({
  email,
  outsideBeachhead,
  countyFips,
  state,
  noCropsEnrolled,
  farmName,
}: Props): ContentResolution {
  if (outsideBeachhead) {
    const stateLabel = state ? formatStateLabel(state) : 'your state';
    return {
      eyebrow: 'Coming to your area',
      headline: `Sell Score launches in ${stateLabel} soon.`,
      body: (
        <>
          <p>
            The Sell Score is live today in Ohio, Indiana, Illinois, Michigan,
            and eastern Iowa. Your county
            {countyFips ? ` (FIPS ${countyFips})` : ''} sits outside the launch
            beachhead, so we don&apos;t yet have local elevator coverage and
            multi-year basis history dialed in for it.
          </p>
          <p>
            We&apos;re expanding state by state through the rest of 2026.
            Email us and we&apos;ll add you to the early-access list — you&apos;ll
            hear the week before launch in your area.
          </p>
        </>
      ),
      mailtoSubject: `Sell Score waitlist — ${stateLabel}`,
    };
  }

  if (noCropsEnrolled) {
    return {
      eyebrow: 'Almost ready',
      headline: farmName
        ? `${farmName} needs crops enrolled.`
        : 'Your farm needs crops enrolled.',
      body: (
        <>
          <p>
            The Sell Score covers corn and soybeans at v1. Your farm
            doesn&apos;t currently have either crop set up for tracking, so
            we can&apos;t compute a recommendation yet.
          </p>
          <p>
            Send us your expected bushels and breakeven for corn and/or
            soybeans, and we&apos;ll have your account live within 24 hours.
            Wheat, sorghum, and the other ARC/PLC commodities are on the
            v1.1 roadmap.
          </p>
        </>
      ),
      mailtoSubject: 'Sell Score crop enrollment',
    };
  }

  // Default: account exists, no farm provisioned
  return {
    eyebrow: 'Welcome',
    headline: 'Your Sell Score is being set up.',
    body: (
      <>
        <p>
          You&apos;re signed in{email ? ` as ${email}` : ''}, but your farm
          hasn&apos;t been provisioned for Sell Score access yet. We&apos;re
          rolling out access in waves to the first beta cohort.
        </p>
        <p>
          Send us your county, total acres, expected bushels per crop, your
          breakeven if you know it, and your ARC/PLC election — and we&apos;ll
          have your live Sell Score running within 24 hours.
        </p>
      </>
    ),
    mailtoSubject: 'Sell Score beta provisioning',
  };
}

/**
 * Two-letter state codes get the friendly form ("OH" → "Ohio"); anything
 * else (full names already, or unknown) is returned as-is.
 */
function formatStateLabel(state: string): string {
  const trimmed = state.trim();
  if (trimmed.length !== 2) return trimmed;
  const map: Record<string, string> = {
    OH: 'Ohio',
    IN: 'Indiana',
    IL: 'Illinois',
    MI: 'Michigan',
    IA: 'Iowa',
    MN: 'Minnesota',
    NE: 'Nebraska',
    KS: 'Kansas',
    SD: 'South Dakota',
    ND: 'North Dakota',
    MO: 'Missouri',
    AR: 'Arkansas',
    MS: 'Mississippi',
    LA: 'Louisiana',
    TN: 'Tennessee',
    KY: 'Kentucky',
    TX: 'Texas',
    WA: 'Washington',
    OR: 'Oregon',
    ID: 'Idaho',
    CA: 'California',
    AZ: 'Arizona',
    MT: 'Montana',
    WI: 'Wisconsin',
  };
  return map[trimmed.toUpperCase()] ?? trimmed;
}

// Brand gold for the CTA — matches the brand system documented in the
// project conventions (#C9A84C primary). Kept inline (not a token) so
// this component doesn't depend on a token export that may not exist
// on the existing _tokens module.
const BRAND_GOLD = '#C9A84C';
