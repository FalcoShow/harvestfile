import PriceAlertManager from '@/components/dashboard/PriceAlertManager';

export const metadata = {
  title: 'Price Alerts — HarvestFile',
  description: 'Set up commodity price alerts and get notified when prices cross your thresholds.',
};

export default function AlertsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <PriceAlertManager />
    </div>
  );
}
