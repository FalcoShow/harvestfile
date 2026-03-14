import * as React from 'react';

interface TrialEndingEmailProps { firstName?: string; daysLeft?: number; reportsGenerated?: number; alertsCreated?: number; }

export const TrialEndingEmail = ({ firstName = 'Farmer', daysLeft = 2, reportsGenerated = 0, alertsCreated = 0 }: TrialEndingEmailProps) => (
  <html lang="en"><head><meta charSet="utf-8" /></head>
  <body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{daysLeft} days left on your Pro trial.</div>
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f3f4f6' }}><tbody><tr><td align="center" style={{ padding: '40px 16px' }}>
      <table width="600" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', width: '100%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}><tbody>
        <tr><td style={{ backgroundColor: '#1B4332', padding: '24px 32px' }}><span style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold' }}>◆</span><span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', marginLeft: '8px' }}>HarvestFile</span></td></tr>
        <tr><td style={{ backgroundColor: '#fef3c7', padding: '14px 32px', borderLeft: '4px solid #f59e0b', textAlign: 'center' as const }}><p style={{ fontSize: '14px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>⏰ Your Pro trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p></td></tr>
        <tr><td style={{ padding: '28px 32px 16px' }}><p style={{ fontSize: '15px', color: '#374151', margin: 0, lineHeight: '1.6' }}>Hey {firstName},</p><p style={{ fontSize: '15px', color: '#374151', margin: '12px 0', lineHeight: '1.6' }}>Your 14-day Pro trial is almost up. When it ends, you'll lose access to:</p></td></tr>
        <tr><td style={{ padding: '8px 32px 20px' }}><table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}><tbody><tr><td style={{ padding: '20px' }}>
          {['Unlimited AI-powered farm program reports', 'Price & deadline alerts with email notifications', 'County-level yield data from USDA NASS', reportsGenerated > 0 ? `Your ${reportsGenerated} generated report${reportsGenerated !== 1 ? 's' : ''}` : 'Saved farm operations', alertsCreated > 0 ? `Your ${alertsCreated} active price alert${alertsCreated !== 1 ? 's' : ''}` : 'PDF exports for your FSA office'].map((item, i) => (
            <p key={i} style={{ fontSize: '14px', color: '#991b1b', margin: i === 0 ? '0 0 8px' : '8px 0', lineHeight: '1.4' }}>✕ {item}</p>
          ))}
        </td></tr></tbody></table></td></tr>
        <tr><td style={{ padding: '0 32px 20px' }}><table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}><tbody><tr><td style={{ padding: '20px' }}><p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1B4332', margin: '0 0 8px' }}>Keep everything for less than $1/day</p><p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5' }}>Pro is <strong>$29/month</strong>. The average Pro member finds <strong>$2,400+</strong> in additional USDA payments in their first year.</p></td></tr></tbody></table></td></tr>
        <tr><td style={{ padding: '0 32px 28px', textAlign: 'center' as const }}><a href="https://harvestfile.com/pricing" style={{ display: 'inline-block', backgroundColor: '#16a34a', color: '#fff', padding: '16px 40px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', borderRadius: '8px' }}>Upgrade to Pro →</a><p style={{ fontSize: '12px', color: '#9ca3af', margin: '12px 0 0' }}>Cancel anytime.</p></td></tr>
        <tr><td style={{ padding: '20px 32px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}><p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}><a href="https://harvestfile.com/dashboard" style={{ color: '#6b7280', textDecoration: 'underline' }}>Dashboard</a> · <a href="https://harvestfile.com" style={{ color: '#6b7280', textDecoration: 'underline' }}>harvestfile.com</a></p></td></tr>
      </tbody></table>
    </td></tr></tbody></table>
  </body></html>
);
export default TrialEndingEmail;
