// =============================================================================
// HarvestFile — Shared Email Layout
// components/emails/shared/EmailLayout.tsx
//
// Build 18 Deploy 6B: Base wrapper for ALL HarvestFile emails.
// Handles: brand header, CAN-SPAM footer (PO Box, unsubscribe link),
// consistent typography, dark forest-green theme that survives email
// client dark mode rendering (Apple Mail, Gmail, Outlook).
//
// CAN-SPAM required elements (per FTC, penalties up to $53,088/violation):
//   1. Accurate sender identification
//   2. Non-deceptive subject line
//   3. Physical postal address (PO Box is FTC-approved)
//   4. Clear unsubscribe mechanism
//   5. Honor opt-out within 48 hours (Google/Yahoo requirement)
//
// RFC 8058 one-click unsubscribe headers are set in the Resend send call,
// not in the email template. See enrollment-drip.ts for header config.
// =============================================================================

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
  Font,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
  unsubscribeToken: string;
}

const BASE_URL = 'https://www.harvestfile.com';

export default function EmailLayout({
  previewText,
  children,
  unsubscribeToken,
}: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <Font
          fontFamily="Bricolage Grotesque"
          fallbackFontFamily="Verdana"
          webFont={{
            url: 'https://fonts.gstatic.com/s/bricolagegrotesque/v7/3y9U6as8bTXq_nANBjzKo3IeZxkz8aBGRw.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* ── Brand Header ──────────────────────────────────────── */}
          <Section style={headerStyle}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td>
                    <Link href={BASE_URL} style={logoLinkStyle}>
                      <span style={logoIconStyle}>◆</span>
                      <span style={logoTextStyle}>HarvestFile</span>
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── Email Content ─────────────────────────────────────── */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* ── CAN-SPAM Footer ───────────────────────────────────── */}
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              HarvestFile LLC — Free ARC/PLC Decision Tools for American Farmers
            </Text>
            <Text style={footerAddressStyle}>
              HarvestFile LLC · PO Box · Tallmadge, OH 44278
            </Text>
            <Text style={footerLinksStyle}>
              <Link href={`${BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`} style={unsubLinkStyle}>
                Unsubscribe
              </Link>
              {' · '}
              <Link href={`${BASE_URL}/privacy`} style={footerLinkStyle}>
                Privacy Policy
              </Link>
              {' · '}
              <Link href={BASE_URL} style={footerLinkStyle}>
                harvestfile.com
              </Link>
            </Text>
            <Text style={footerDisclaimerStyle}>
              This email is for informational purposes only. HarvestFile is not a financial
              advisor, crop insurance agent, or government agency. Consult your local FSA
              office before making ARC/PLC election decisions.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Using inline styles (required for email client compatibility).
// Max-width 600px for universal rendering. Using off-whites instead of
// pure white to reduce dark-mode inversion artifacts.

const bodyStyle = {
  backgroundColor: '#f3f4f1',
  fontFamily: "'Bricolage Grotesque', 'Trebuchet MS', Verdana, Arial, sans-serif",
  margin: '0' as const,
  padding: '0' as const,
};

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#f3f4f1',
};

const headerStyle = {
  backgroundColor: '#1B4332',
  padding: '20px 28px',
  borderRadius: '8px 8px 0 0',
};

const logoLinkStyle = {
  textDecoration: 'none' as const,
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
};

const logoIconStyle = {
  color: '#34D399',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  lineHeight: '1',
};

const logoTextStyle = {
  color: '#FFFFFF',
  fontSize: '17px',
  fontWeight: 'bold' as const,
  marginLeft: '8px',
  letterSpacing: '-0.01em',
};

const contentStyle = {
  backgroundColor: '#FFFFFF',
  padding: '28px 28px 20px',
};

const hrStyle = {
  borderColor: '#e2ddd3',
  borderTop: '1px solid #e2ddd3',
  margin: '0',
};

const footerStyle = {
  backgroundColor: '#FFFFFF',
  padding: '16px 28px 24px',
  borderRadius: '0 0 8px 8px',
};

const footerTextStyle = {
  fontSize: '12px',
  color: '#6B7264',
  lineHeight: '1.4',
  margin: '0 0 4px',
  textAlign: 'center' as const,
};

const footerAddressStyle = {
  fontSize: '11px',
  color: '#9CA38F',
  lineHeight: '1.4',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const footerLinksStyle = {
  fontSize: '11px',
  color: '#9CA38F',
  lineHeight: '1.4',
  margin: '0 0 12px',
  textAlign: 'center' as const,
};

const unsubLinkStyle = {
  color: '#1B4332',
  textDecoration: 'underline' as const,
  fontWeight: '600' as const,
};

const footerLinkStyle = {
  color: '#6B7264',
  textDecoration: 'underline' as const,
};

const footerDisclaimerStyle = {
  fontSize: '10px',
  color: '#B0B5A8',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
  fontStyle: 'italic' as const,
};
