// =============================================================================
// HarvestFile — Drip Email 4: Morning Dashboard Upgrade Offer
// components/emails/drip/UpgradeOfferEmail.tsx
//
// Build 18 Deploy 6B: Sent 14 days after email capture.
// Purpose: Bridge from one-time calculator user → daily habit user.
// This is the conversion email. Show the value of daily engagement.
//
// Subject: "[FirstName], See Your County's Latest Numbers Every Morning"
// Send time: Day 14 (only if user hasn't already created an account)
// Classification: Commercial
// =============================================================================

import {
  Text,
  Section,
  Button,
} from '@react-email/components';
import EmailLayout from '../shared/EmailLayout';

interface UpgradeOfferEmailProps {
  countyName: string;
  stateAbbr: string;
  cropName: string;
  unsubscribeToken: string;
}

const BASE_URL = 'https://www.harvestfile.com';

export default function UpgradeOfferEmail({
  countyName = 'Darke County',
  stateAbbr = 'OH',
  cropName = 'Corn',
  unsubscribeToken = 'preview-token',
}: UpgradeOfferEmailProps) {
  return (
    <EmailLayout
      previewText={`Prices, weather, grain bids, and ARC/PLC projections for ${countyName} — updated every morning`}
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={headingStyle}>
        Your county&apos;s numbers change every day.
      </Text>

      <Text style={bodyTextStyle}>
        Two weeks ago, you ran an ARC/PLC analysis for {cropName} in {countyName}, {stateAbbr}.
        Since then, futures prices have moved, weather forecasts have shifted, and grain
        bids at your local elevators have changed.
      </Text>

      <Text style={bodyTextStyle}>
        All of that affects your estimated ARC/PLC payments.
      </Text>

      {/* ── Morning Dashboard Preview ──────────────────────────── */}
      <Section style={dashboardPreviewStyle}>
        <Text style={dashboardTitleStyle}>
          Your Morning Dashboard includes:
        </Text>

        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            {[
              { icon: '📈', label: 'Live commodity prices', desc: 'CME corn, soybeans, wheat — how they affect your payment projections' },
              { icon: '🌤️', label: 'Local weather forecast', desc: `7-day outlook for ${countyName} with severe weather alerts` },
              { icon: '🏪', label: 'Grain bids nearby', desc: 'Cash bids from elevators within 50 miles, updated daily via Barchart' },
              { icon: '📊', label: 'ARC/PLC payment tracker', desc: 'How today\'s prices change your estimated payment — updated in real time' },
              { icon: '📅', label: 'USDA report calendar', desc: 'WASDE, Crop Progress, Prospective Plantings — every report that moves markets' },
            ].map((item, i) => (
              <tr key={i}>
                <td style={featureIconStyle}>{item.icon}</td>
                <td style={featureCellStyle}>
                  <Text style={featureLabelStyle}>{item.label}</Text>
                  <Text style={featureDescStyle}>{item.desc}</Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Text style={bodyTextStyle}>
        It takes 30 seconds to check every morning. Many farmers tell us it&apos;s
        become part of their routine — like checking the weather before heading out.
      </Text>

      <Section style={ctaContainerStyle}>
        <Button href={`${BASE_URL}/morning`} style={ctaPrimaryStyle}>
          See Today&apos;s Dashboard
        </Button>
      </Section>

      <Section style={ctaContainerStyle}>
        <Button href={`${BASE_URL}/signup`} style={ctaSecondaryStyle}>
          Create Free Account — Save Your Preferences
        </Button>
      </Section>

      <Text style={freeNoteStyle}>
        The Morning Dashboard is free. No credit card. No trial. Just farm
        intelligence, every morning.
      </Text>

      <Text style={signoffStyle}>
        — The HarvestFile Team
      </Text>
    </EmailLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const headingStyle = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#1A1A1A',
  lineHeight: '1.3',
  margin: '0 0 12px',
};

const bodyTextStyle = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.65',
  margin: '0 0 16px',
};

const dashboardPreviewStyle = {
  backgroundColor: '#0C1F17',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '0 0 20px',
};

const dashboardTitleStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#C9A84C',
  margin: '0 0 14px',
  letterSpacing: '0.02em',
};

const featureIconStyle = {
  width: '32px',
  verticalAlign: 'top' as const,
  paddingTop: '4px',
  fontSize: '16px',
};

const featureCellStyle = {
  paddingLeft: '8px',
  paddingBottom: '12px',
  verticalAlign: 'top' as const,
};

const featureLabelStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#E8E6E1',
  lineHeight: '1.3',
  margin: '0 0 2px',
};

const featureDescStyle = {
  fontSize: '12px',
  color: '#8B9A82',
  lineHeight: '1.45',
  margin: '0',
};

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '0 0 10px',
};

const ctaPrimaryStyle = {
  backgroundColor: '#C9A84C',
  color: '#0C1F17',
  fontSize: '15px',
  fontWeight: '700' as const,
  padding: '13px 28px',
  borderRadius: '8px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
};

const ctaSecondaryStyle = {
  backgroundColor: 'transparent',
  color: '#1B4332',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '11px 24px',
  borderRadius: '8px',
  border: '1px solid #1B4332',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
};

const freeNoteStyle = {
  fontSize: '12px',
  color: '#9CA38F',
  lineHeight: '1.5',
  margin: '8px 0 16px',
  textAlign: 'center' as const,
  fontStyle: 'italic' as const,
};

const signoffStyle = {
  fontSize: '14px',
  color: '#6B7264',
  fontStyle: 'italic' as const,
  margin: '16px 0 0',
};
