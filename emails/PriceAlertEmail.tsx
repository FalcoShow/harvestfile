import * as React from 'react';

interface PriceAlertEmailProps {
  farmerName?: string;
  commodity: string;
  currentPrice: number;
  threshold: number;
  condition: 'above' | 'below';
  state?: string;
  priceUnit?: string;
}

export const PriceAlertEmail = ({
  farmerName = 'Farmer', commodity = 'Corn', currentPrice = 4.19,
  threshold = 4.50, condition = 'below', state = '', priceUnit = '/bu',
}: PriceAlertEmailProps) => {
  const isUp = condition === 'above';
  const arrow = isUp ? '▲' : '▼';
  const accent = isUp ? '#16a34a' : '#dc2626';
  const accentBg = isUp ? '#f0fdf4' : '#fef2f2';
  const diff = Math.abs(currentPrice - threshold).toFixed(2);
  const name = commodity.charAt(0) + commodity.slice(1).toLowerCase();

  return (
    <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>{name}: ${currentPrice.toFixed(2)} {isUp ? 'exceeded' : 'dropped below'} your ${threshold.toFixed(2)} threshold</div>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f3f4f6' }}><tbody><tr><td align="center" style={{ padding: '40px 16px' }}>
        <table width="600" cellPadding="0" cellSpacing="0" style={{ maxWidth: '600px', width: '100%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}><tbody>
          <tr><td style={{ backgroundColor: '#1B4332', padding: '24px 32px', textAlign: 'center' as const }}><span style={{ color: '#10b981', fontSize: '24px', fontWeight: 'bold' }}>◆</span><span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', marginLeft: '8px' }}>HarvestFile</span></td></tr>
          <tr><td style={{ backgroundColor: accentBg, padding: '16px 32px', borderLeft: `4px solid ${accent}` }}><p style={{ color: accent, fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{arrow} PRICE ALERT</p><p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>{name} has {isUp ? 'exceeded' : 'dropped below'} your threshold</p></td></tr>
          <tr><td style={{ padding: '24px 32px 8px' }}><p style={{ fontSize: '15px', color: '#374151', margin: 0, lineHeight: '1.6' }}>Hi {farmerName},</p><p style={{ fontSize: '15px', color: '#374151', margin: '8px 0 0', lineHeight: '1.6' }}>{name}{state ? ` in ${state}` : ''} is now <strong style={{ color: accent }}>${currentPrice.toFixed(2)}{priceUnit}</strong>, which is ${diff} {isUp ? 'above' : 'below'} your threshold of ${threshold.toFixed(2)}{priceUnit}.</p></td></tr>
          <tr><td style={{ padding: '16px 32px' }}><table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' as const }}><tbody><tr>
            <td style={{ width: '50%', textAlign: 'center' as const, padding: '16px', border: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}><p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' as const }}>Current Price</p><p style={{ fontSize: '28px', fontWeight: 'bold', color: accent, margin: 0 }}>${currentPrice.toFixed(2)}</p></td>
            <td style={{ width: '50%', textAlign: 'center' as const, padding: '16px', border: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}><p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' as const }}>Your Threshold</p><p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>${threshold.toFixed(2)}</p></td>
          </tr></tbody></table></td></tr>
          <tr><td style={{ padding: '8px 32px 24px', textAlign: 'center' as const }}><a href="https://harvestfile.com/dashboard/intelligence" style={{ display: 'inline-block', backgroundColor: '#1B4332', color: '#fff', padding: '14px 32px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none', borderRadius: '8px' }}>View Intelligence Dashboard →</a></td></tr>
          <tr><td style={{ padding: '0 32px 24px' }}><table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}><tbody><tr><td style={{ padding: '16px 20px' }}><p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', fontWeight: 'bold' }}>💡 What this means:</p><p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>{isUp ? `Higher ${name.toLowerCase()} prices may shift the ARC-CO vs PLC calculation. Run a fresh report in the Intelligence Hub.` : `Lower ${name.toLowerCase()} prices could increase your PLC payment potential. Check the Intelligence Hub for updated estimates.`}</p></td></tr></tbody></table></td></tr>
          <tr><td style={{ padding: '20px 32px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}><p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}><a href="https://harvestfile.com/dashboard/alerts" style={{ color: '#6b7280', textDecoration: 'underline' }}>Manage alerts</a> · <a href="https://harvestfile.com" style={{ color: '#6b7280', textDecoration: 'underline' }}>harvestfile.com</a></p></td></tr>
        </tbody></table>
      </td></tr></tbody></table>
    </body></html>
  );
};

export default PriceAlertEmail;
