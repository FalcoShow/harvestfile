// =============================================================================
// HarvestFile — Drip Email 3: Enrollment Preparation Checklist
// components/emails/drip/ChecklistEmail.tsx
//
// Build 18 Deploy 6B: Sent 7 days after email capture.
// Purpose: Give farmers a concrete action checklist before visiting FSA.
//
// Subject: "Your 2026 Enrollment Checklist — 7 Steps Before You Visit FSA"
// Send time: Day 7
// Classification: Commercial
// =============================================================================

import {
  Text,
  Section,
  Button,
} from '@react-email/components';
import EmailLayout from '../shared/EmailLayout';

interface ChecklistEmailProps {
  countyName: string;
  stateAbbr: string;
  unsubscribeToken: string;
}

const BASE_URL = 'https://www.harvestfile.com';

const CHECKLIST_ITEMS = [
  {
    title: 'Know your farm numbers',
    desc: 'Farm serial number (FSN), tract numbers, and base acres for each crop. These are on your FSA-156EZ form.',
  },
  {
    title: 'Check your base acres',
    desc: 'OBBBA allows 30 million new base acres nationally. If you planted crops in 2019-2023 without base acres, you may be eligible.',
  },
  {
    title: 'Review PLC payment yields',
    desc: 'You can update your PLC yield using 2019-2023 actual yields. This only matters if you choose PLC.',
  },
  {
    title: 'Run your ARC/PLC analysis',
    desc: 'Use HarvestFile to compare estimated payments for each program. The answer is different for every county and crop.',
  },
  {
    title: 'Check multi-crop strategy',
    desc: 'You can choose ARC-CO for corn and PLC for soybeans on the same farm. Optimize each crop independently.',
  },
  {
    title: 'Talk to your landlord',
    desc: 'If you rent, the landowner must agree to the election. Both parties sign the CCC-862. Start this conversation early.',
  },
  {
    title: 'Schedule your FSA appointment',
    desc: 'County offices get overwhelmed during enrollment. Call early. Bring your FSA-156EZ and your HarvestFile printout.',
  },
];

export default function ChecklistEmail({
  countyName = 'Darke County',
  stateAbbr = 'OH',
  unsubscribeToken = 'preview-token',
}: ChecklistEmailProps) {
  return (
    <EmailLayout
      previewText="7 steps to complete before your FSA appointment — be ready when enrollment opens"
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={headingStyle}>
        Your 2026 enrollment checklist
      </Text>

      <Text style={bodyTextStyle}>
        The enrollment window hasn&apos;t opened yet, but when it does, the farmers
        who prepared in advance will have a significant advantage. County FSA offices
        will be overwhelmed — USDA has lost 20% of its workforce, and 752,072 farms
        must re-elect under OBBBA.
      </Text>

      <Text style={bodyTextStyle}>
        Here are 7 steps you can take now:
      </Text>

      {/* ── Checklist ──────────────────────────────────────────── */}
      <Section style={checklistContainerStyle}>
        {CHECKLIST_ITEMS.map((item, i) => (
          <table key={i} cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={checkboxCellStyle}>
                  <div style={checkboxStyle}>☐</div>
                </td>
                <td style={checkItemCellStyle}>
                  <Text style={checkTitleStyle}>{item.title}</Text>
                  <Text style={checkDescStyle}>{item.desc}</Text>
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </Section>

      <Section style={ctaContainerStyle}>
        <Button href={`${BASE_URL}/check`} style={ctaButtonStyle}>
          Run My Analysis for {countyName}
        </Button>
      </Section>

      <Section style={tipBoxStyle}>
        <Text style={tipTextStyle}>
          <strong>Pro tip:</strong> Print your HarvestFile analysis and bring it to
          your FSA appointment. The comparison matrix, historical payments, and county
          election data give you and your FSA officer a shared reference point.
        </Text>
      </Section>

      <Text style={nextEmailStyle}>
        Next email (in 7 days): How to track daily prices, weather, and grain bids
        that affect your payments — all in one place.
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

const checklistContainerStyle = {
  margin: '0 0 20px',
};

const checkboxCellStyle = {
  width: '28px',
  verticalAlign: 'top' as const,
  paddingTop: '2px',
};

const checkboxStyle = {
  fontSize: '16px',
  color: '#1B4332',
};

const checkItemCellStyle = {
  paddingLeft: '8px',
  verticalAlign: 'top' as const,
};

const checkTitleStyle = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#1A1A1A',
  lineHeight: '1.3',
  margin: '0 0 2px',
};

const checkDescStyle = {
  fontSize: '13px',
  color: '#6B7264',
  lineHeight: '1.5',
  margin: '0 0 0',
};

const ctaContainerStyle = {
  textAlign: 'center' as const,
  margin: '8px 0 20px',
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

const tipBoxStyle = {
  backgroundColor: '#FDF8F0',
  border: '1px solid #E2C366',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 20px',
};

const tipTextStyle = {
  fontSize: '13px',
  color: '#6B5B20',
  lineHeight: '1.55',
  margin: '0',
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
