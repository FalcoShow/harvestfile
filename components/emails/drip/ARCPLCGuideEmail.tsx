// =============================================================================
// HarvestFile — Drip Email 2: ARC vs PLC Plain-Language Guide
// components/emails/drip/ARCPLCGuideEmail.tsx
//
// Build 18 Deploy 6B: Sent 3 days after email capture.
// Purpose: Educate on ARC vs PLC mechanics in plain English.
// This builds trust and positions HarvestFile as the authority.
//
// Subject: "ARC vs PLC: A Plain-Language Guide for [County] Farmers"
// Send time: Day 3, Tuesday/Wednesday 5:30 AM Central
// Classification: Commercial (requires unsubscribe + physical address)
// =============================================================================

import {
  Text,
  Link,
  Section,
  Button,
} from '@react-email/components';
import EmailLayout from '../shared/EmailLayout';

interface ARCPLCGuideEmailProps {
  countyName: string;
  stateAbbr: string;
  cropName: string;
  unsubscribeToken: string;
}

const BASE_URL = 'https://www.harvestfile.com';

export default function ARCPLCGuideEmail({
  countyName = 'Darke County',
  stateAbbr = 'OH',
  cropName = 'Corn',
  unsubscribeToken = 'preview-token',
}: ARCPLCGuideEmailProps) {
  return (
    <EmailLayout
      previewText={`How ARC-CO and PLC actually calculate your payments — no spreadsheets, no jargon`}
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={headingStyle}>
        ARC vs PLC: what you actually need to know
      </Text>

      <Text style={bodyTextStyle}>
        Most ARC/PLC explanations read like they were written by USDA lawyers.
        Here&apos;s the version written for the farmer who just needs to make a
        good decision for 2026.
      </Text>

      {/* ── ARC-CO Section ─────────────────────────────────────── */}
      <Section style={programCardStyle}>
        <Text style={programTitleStyle}>
          <span style={arcBadgeStyle}>ARC-CO</span> Agriculture Risk Coverage — County
        </Text>
        <Text style={programDescStyle}>
          ARC-CO pays when your <strong>county&apos;s actual revenue</strong> falls
          below a guarantee based on recent history. It uses county-average yields and
          national marketing-year prices. Under OBBBA, the guarantee is now{' '}
          <strong>90% of the benchmark</strong> (up from 86%).
        </Text>
        <Text style={programKeyStyle}>
          <strong>Best when:</strong> your county has a bad yield year or prices drop
          moderately. Pays more often in volatile counties. Capped at 12% of benchmark
          revenue per acre (up from 10%).
        </Text>
      </Section>

      {/* ── PLC Section ────────────────────────────────────────── */}
      <Section style={programCardStyle}>
        <Text style={programTitleStyle}>
          <span style={plcBadgeStyle}>PLC</span> Price Loss Coverage
        </Text>
        <Text style={programDescStyle}>
          PLC pays when the <strong>national marketing-year average price</strong>{' '}
          falls below a reference price set by law. It doesn&apos;t care about your
          county&apos;s yields — only the national price matters. Payment limit raised
          to <strong>$155,000</strong> under OBBBA.
        </Text>
        <Text style={programKeyStyle}>
          <strong>Best when:</strong> prices drop significantly below the reference
          price. In strong price years, PLC pays nothing. In crash years, PLC can pay
          substantially more than ARC-CO.
        </Text>
      </Section>

      {/* ── The Decision ───────────────────────────────────────── */}
      <Text style={subheadingStyle}>The real question</Text>

      <Text style={bodyTextStyle}>
        The choice comes down to: <strong>do you expect a moderate dip or a deep drop?</strong>{' '}
        ARC-CO covers the moderate dips. PLC covers the deep drops. That&apos;s why
        HarvestFile runs the numbers for {countyName} specifically — because the answer
        depends on your county&apos;s yield history and current price projections.
      </Text>

      <Text style={bodyTextStyle}>
        Under OBBBA (the 2024 Farm Bill extension), you must re-elect for the{' '}
        <strong>2025 and 2026 crop years</strong>. Your previous election does NOT carry
        forward. Every farm with base acres needs to make an active choice.
      </Text>

      <Section style={ctaContainerStyle}>
        <Button href={`${BASE_URL}/check`} style={ctaButtonStyle}>
          Re-Run My {cropName} Analysis
        </Button>
      </Section>

      <Text style={nextEmailStyle}>
        Next email (in 4 days): Your 2026 enrollment checklist — 7 steps to complete
        before visiting FSA.
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

const subheadingStyle = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#1B4332',
  lineHeight: '1.3',
  margin: '24px 0 8px',
};

const programCardStyle = {
  backgroundColor: '#f8faf7',
  border: '1px solid #e2ddd3',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '0 0 12px',
};

const programTitleStyle = {
  fontSize: '15px',
  fontWeight: '700' as const,
  color: '#1A1A1A',
  margin: '0 0 8px',
  lineHeight: '1.4',
};

const arcBadgeStyle = {
  display: 'inline-block' as const,
  backgroundColor: '#C9A84C',
  color: '#0C1F17',
  fontSize: '11px',
  fontWeight: '800' as const,
  padding: '2px 7px',
  borderRadius: '4px',
  marginRight: '6px',
  letterSpacing: '0.03em',
  verticalAlign: 'middle' as const,
};

const plcBadgeStyle = {
  display: 'inline-block' as const,
  backgroundColor: '#1B4332',
  color: '#FFFFFF',
  fontSize: '11px',
  fontWeight: '800' as const,
  padding: '2px 7px',
  borderRadius: '4px',
  marginRight: '6px',
  letterSpacing: '0.03em',
  verticalAlign: 'middle' as const,
};

const programDescStyle = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const programKeyStyle = {
  fontSize: '13px',
  color: '#6B7264',
  lineHeight: '1.55',
  margin: '0',
  fontStyle: 'italic' as const,
};

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '8px 0 24px',
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

const nextEmailStyle = {
  fontSize: '12px',
  color: '#9CA38F',
  lineHeight: '1.5',
  margin: '0 0 8px',
  fontStyle: 'italic' as const,
};

const signoffStyle = {
  fontSize: '14px',
  color: '#6B7264',
  fontStyle: 'italic' as const,
  margin: '16px 0 0',
};
