import * as React from 'react';

interface WelcomeEmailProps { firstName?: string; }

export const WelcomeEmail = ({ firstName = 'Farmer' }: WelcomeEmailProps) => {
  const steps = [
    { n: '1', title: 'Run Your ARC/PLC Calculator', desc: 'Enter your state, county, and crop to see side-by-side payment estimates.', url: 'https://harvestfile.com/check', cta: 'Open Calculator' },
    { n: '2', title: 'Check the Intelligence Hub', desc: 'Live commodity prices, county data, and AI-powered farm program reports.', url: 'https://harvestfile.com/dashboard/intelligence', cta: 'Open Intelligence Hub' },
    { n: '3', title: 'Set Up Price Alerts', desc: 'Get notified when corn, soybeans, or wheat prices cross your thresholds.', url: 'https://harvestfile.com/dashboard/alerts', cta: 'Create Alert' },
  ];
  return (
    <html lang="en"><head><meta charSet="utf-8" /></head>
    <body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>Your 14-day Pro trial is active. Here are 3 things to do first.</div>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f3f4f6' }}><tbody><tr><td align="center" style={{ padding: '40px 16px' }}>
        <table width="600" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', width: '100%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}><tbody>
          <tr><td style={{ backgroundColor: '#1B4332', padding: '32px', textAlign: 'center' as const }}><p style={{ color: '#10b981', fontSize: '28px', margin: '0 0 4px' }}>◆</p><p style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px' }}>Welcome to HarvestFile</p><p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>Your 14-day Pro trial is now active</p></td></tr>
          <tr><td style={{ padding: '28px 32px 16px' }}><p style={{ fontSize: '15px', color: '#374151', margin: 0, lineHeight: '1.6' }}>Hey {firstName},</p><p style={{ fontSize: '15px', color: '#374151', margin: '12px 0', lineHeight: '1.6' }}>You now have full access to every tool in HarvestFile — live USDA commodity prices, AI-powered reports, price alerts, and the ARC/PLC calculator with county-level yield data. Here are 3 things to do first:</p></td></tr>
          {steps.map((s, i) => (<tr key={i}><td style={{ padding: '8px 32px' }}><table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}><tbody><tr><td style={{ padding: '20px' }}><table width="100%" cellPadding="0" cellSpacing="0"><tbody><tr><td style={{ width: '36px', verticalAlign: 'top' }}><div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1B4332', color: '#fff', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' as const, lineHeight: '28px' }}>{s.n}</div></td><td><p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1B4332', margin: '0 0 4px' }}>{s.title}</p><p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.5' }}>{s.desc}</p><a href={s.url} style={{ display: 'inline-block', backgroundColor: '#1B4332', color: '#fff', padding: '8px 20px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', borderRadius: '6px' }}>{s.cta} →</a></td></tr></tbody></table></td></tr></tbody></table></td></tr>))}
          <tr><td style={{ padding: '20px 32px 28px' }}><p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Questions? Reply to this email.</p><p style={{ fontSize: '14px', color: '#374151', margin: '8px 0 0', fontWeight: '600' }}>— The HarvestFile Team</p></td></tr>
          <tr><td style={{ padding: '20px 32px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}><p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}><a href="https://harvestfile.com/dashboard" style={{ color: '#6b7280', textDecoration: 'underline' }}>Dashboard</a> · <a href="https://harvestfile.com/pricing" style={{ color: '#6b7280', textDecoration: 'underline' }}>Pricing</a> · <a href="https://harvestfile.com" style={{ color: '#6b7280', textDecoration: 'underline' }}>harvestfile.com</a></p></td></tr>
        </tbody></table>
      </td></tr></tbody></table>
    </body></html>
  );
};
export default WelcomeEmail;
