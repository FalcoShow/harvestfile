// =============================================================================
// HarvestFile — Drip Email 1: Welcome + Analysis Saved
// components/emails/drip/WelcomeEmail.tsx
//
// Deploy 6B-final: FIXED — "View My Full Analysis" button now includes query
// parameters for deep-linking back to the results page with pre-populated
// calculator state (state, county, crop, acres, tab).
//
// Build 18 Deploy 6B: Sent immediately after email capture on /check.
// Purpose: Confirm the save, show what they calculated, set expectations.
//
// Subject: "Your ARC/PLC Analysis Is Saved"
// Send time: Immediately (Day 0)
// Classification: Transactional (user explicitly requested save)
// =============================================================================

import {
  Text,
  Link,
  Section,
  Button,
} from '@react-email/components';
import EmailLayout from '../shared/EmailLayout';

interface WelcomeEmailProps {
  countyName: string;
  stateAbbr: string;
  cropName: string;
  acres: string;
  recommendation: string; // 'ARC-CO' | 'PLC' | 'Similar'
  arcPerAcre: number;
  plcPerAcre: number;
  unsubscribeToken: string;
  // Deploy 6B-final: Deep-link params
  countyFips?: string;
  cropCode?: string;
}

const BASE_URL = 'https://www.harvestfile.com';

export default function WelcomeEmail({
  countyName = 'Darke County',
  stateAbbr = 'OH',
  cropName = 'Corn',
  acres = '500',
  recommendation = 'ARC-CO',
  arcPerAcre = 42.18,
  plcPerAcre = 28.50,
  unsubscribeToken = 'preview-token',
  countyFips = '',
  cropCode = 'CORN',
}: WelcomeEmailProps) {
  const winnerAmount = recommendation === 'PLC' ? plcPerAcre : arcPerAcre;
  const loserAmount = recommendation === 'PLC' ? arcPerAcre : plcPerAcre;
  const winnerLabel = recommendation === 'Similar' ? 'Both programs' : recommendation;

  // Deploy 6B-final: Build deep-link URL with query params
  // This takes the farmer back to their exact results, not the blank calculator
  const deepLinkParams = new URLSearchParams();
  if (stateAbbr) deepLinkParams.set('state', stateAbbr);
  if (countyFips) deepLinkParams.set('county', countyFips);
  if (cropCode) deepLinkParams.set('crop', cropCode);
  if (acres) deepLinkParams.set('acres', acres);
  deepLinkParams.set('tab', 'comparison');
  const analysisUrl = `${BASE_URL}/check?${deepLinkParams.toString()}`;

  return (
    <EmailLayout
      previewText={`Your ${cropName} analysis for ${countyName}, ${stateAbbr} is saved — ${winnerLabel} leads at $${winnerAmount.toFixed(2)}/acre`}
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={greetingStyle}>Your analysis is saved.</Text>

      <Text style={bodyTextStyle}>
        Here&apos;s a summary of what HarvestFile calculated for your operation:
      </Text>

      {/* ── Analysis Summary Card ──────────────────────────────── */}
      <Section style={summaryCardStyle}>
        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={summaryLabelStyle}>County</td>
              <td style={summaryValueStyle}>{countyName}, {stateAbbr}</td>
            </tr>
            <tr>
              <td style={summaryLabelStyle}>Crop</td>
              <td style={summaryValueStyle}>{cropName}</td>
            </tr>
            <tr>
              <td style={summaryLabelStyle}>Base Acres</td>
              <td style={summaryValueStyle}>{acres}</td>
            </tr>
            <tr>
              <td style={{ ...summaryLabelStyle, borderBottom: 'none' }}>Recommendation</td>
              <td style={{ ...summaryValueStyle, borderBottom: 'none', color: '#1B4332', fontWeight: '700' }}>
                {winnerLabel} — ${winnerAmount.toFixed(2)}/acre
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Text style={bodyTextStyle}>
        Your full analysis — including historical payments, county election trends,
        and multi-crop optimization — is available anytime at:
      </Text>

      <Section style={ctaContainerStyle}>
        <Button href={analysisUrl} style={ctaButtonStyle}>
          View My Full Analysis
        </Button>
      </Section>

      {/* ── What's Next ────────────────────────────────────────── */}
      <Text style={subheadingStyle}>What happens next</Text>

      <Text style={bodyTextStyle}>
        Over the next two weeks, we&apos;ll send you three short emails to help you
        prepare for the 2026 ARC/PLC enrollment window:
      </Text>

      <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%', marginBottom: '16px' }}>
        <tbody>
          <tr>
            <td style={stepNumberStyle}>1</td>
            <td style={stepTextStyle}>
              <strong>ARC vs PLC guide</strong> — a plain-language breakdown of how each
              program calculates payments (no spreadsheets required)
            </td>
          </tr>
          <tr>
            <td style={stepNumberStyle}>2</td>
            <td style={stepTextStyle}>
              <strong>Enrollment checklist</strong> — 7 steps to complete before you
              visit your FSA office
            </td>
          </tr>
          <tr>
            <td style={stepNumberStyle}>3</td>
            <td style={stepTextStyle}>
              <strong>Daily farm intelligence</strong> — how to track prices, weather,
              and grain bids that affect your ARC/PLC payments every morning
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={bodyTextStyle}>
        We&apos;ll also notify you the moment the 2026 enrollment window opens —
        so you never miss a deadline.
      </Text>

      <Text style={signoffStyle}>
        — The HarvestFile Team
      </Text>
    </EmailLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const greetingStyle = {
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

const subheadingStyle = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#1B4332',
  lineHeight: '1.3',
  margin: '24px 0 8px',
};

const summaryCardStyle = {
  backgroundColor: '#f8faf7',
  border: '1px solid #e2ddd3',
  borderRadius: '10px',
  padding: '0',
  margin: '0 0 20px',
  overflow: 'hidden' as const,
};

const summaryLabelStyle = {
  fontSize: '13px',
  color: '#6B7264',
  padding: '10px 16px',
  borderBottom: '1px solid #e8e5de',
  width: '120px',
  verticalAlign: 'top' as const,
};

const summaryValueStyle = {
  fontSize: '14px',
  color: '#1A1A1A',
  fontWeight: '600' as const,
  padding: '10px 16px',
  borderBottom: '1px solid #e8e5de',
  verticalAlign: 'top' as const,
};

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const ctaButtonStyle = {
  backgroundColor: '#1B4332',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: '700' as const,
  padding: '13px 28px',
  borderRadius: '8px',
  textDecoration: 'none' as const,
  display: 'inline-block' as const,
};

const stepNumberStyle = {
  width: '28px',
  height: '28px',
  backgroundColor: '#1B4332',
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: '700' as const,
  textAlign: 'center' as const,
  borderRadius: '50%',
  verticalAlign: 'top' as const,
  paddingTop: '5px',
};

const stepTextStyle = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.55',
  padding: '2px 0 14px 12px',
  verticalAlign: 'top' as const,
};

const signoffStyle = {
  fontSize: '14px',
  color: '#6B7264',
  fontStyle: 'italic' as const,
  margin: '24px 0 0',
};
