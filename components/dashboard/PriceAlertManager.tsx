// =============================================================================
// HarvestFile - Price Alert Manager Component
// Phase 3D: Uses condition, threshold, created_by schema
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceAlert {
  id: string;
  commodity: string;
  threshold: number;
  condition: string;
  is_active: boolean;
  trigger_mode?: string;
  last_triggered_at: string | null;
  last_notified_price?: number | null;
  trigger_count?: number;
  state?: string;
  created_at: string;
}

const COMMODITIES = [
  { value: 'CORN', label: 'Corn', unit: '/bu', icon: '🌽' },
  { value: 'SOYBEANS', label: 'Soybeans', unit: '/bu', icon: '🫘' },
  { value: 'WHEAT', label: 'Wheat', unit: '/bu', icon: '🌾' },
  { value: 'SORGHUM', label: 'Sorghum', unit: '/bu', icon: '🌿' },
  { value: 'COTTON', label: 'Cotton', unit: '/lb', icon: '☁️' },
  { value: 'RICE', label: 'Rice', unit: '/cwt', icon: '🍚' },
];

const REF_PRICES: Record<string, number> = {
  CORN: 4.19, SOYBEANS: 10.70, WHEAT: 5.50, SORGHUM: 3.75, COTTON: 0.28, RICE: 12.50,
};

export default function PriceAlertManager() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [commodity, setCommodity] = useState('CORN');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [threshold, setThreshold] = useState('');
  const [triggerMode, setTriggerMode] = useState('rearm');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setCreating(true);
    if (!threshold || isNaN(parseFloat(threshold))) { setError('Enter a valid price.'); setCreating(false); return; }
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity, threshold, condition, trigger_mode: triggerMode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create'); return; }
      setAlerts(prev => [data.alert, ...prev]);
      setShowCreate(false); setThreshold('');
      setSuccess('Alert created! You\'ll get an email when the price crosses your threshold.');
      setTimeout(() => setSuccess(''), 4000);
    } catch { setError('Something went wrong.'); } finally { setCreating(false); }
  };

  const toggleAlert = async (id: string, active: boolean) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !active }),
    });
    if (res.ok) setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !active } : a));
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Delete this alert?')) return;
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    if (res.ok) setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getInfo = (v: string) => COMMODITIES.find(c => c.value === v) || COMMODITIES[0];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1B4332', margin: 0, letterSpacing: '-0.02em' }}>Price Alerts</h2>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Get notified when commodity prices cross your thresholds</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#1B4332', color: '#fff', padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <span style={{ fontSize: 18 }}>+</span> New Alert
        </button>
      </div>

      {success && <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span>✅</span><span style={{ fontSize: 14, color: '#166534' }}>{success}</span></div>}

      {/* Create Form */}
      {showCreate && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1B4332', margin: '0 0 16px' }}>Create New Alert</h3>
          <form onSubmit={handleCreate}>
            {/* Commodity */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Commodity</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {COMMODITIES.map(c => (
                  <button key={c.value} type="button" onClick={() => { setCommodity(c.value); setThreshold(REF_PRICES[c.value]?.toFixed(2) || ''); }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: commodity === c.value ? '2px solid #1B4332' : '1px solid #d1d5db', backgroundColor: commodity === c.value ? '#f0fdf4' : '#fff', color: commodity === c.value ? '#1B4332' : '#6b7280', fontWeight: commodity === c.value ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Condition */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Alert when price goes...</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['below', 'above'] as const).map(d => (
                  <button key={d} type="button" onClick={() => setCondition(d)}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: condition === d ? '2px solid #1B4332' : '1px solid #d1d5db', backgroundColor: condition === d ? '#f0fdf4' : '#fff', color: condition === d ? '#1B4332' : '#6b7280', fontWeight: condition === d ? 700 : 500, fontSize: 14, cursor: 'pointer' }}>
                    {d === 'below' ? '▼ Below' : '▲ Above'}
                  </button>
                ))}
              </div>
            </div>
            {/* Threshold */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Price threshold ({getInfo(commodity).unit})</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#6b7280', fontWeight: 600 }}>$</span>
                <input type="number" step="0.01" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder={REF_PRICES[commodity]?.toFixed(2) || '0.00'}
                  style={{ width: '100%', padding: '12px 16px 12px 28px', fontSize: 16, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>Current {getInfo(commodity).label}: ~${REF_PRICES[commodity]?.toFixed(2)}{getInfo(commodity).unit}</p>
            </div>
            {/* Trigger mode */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Alert behavior</label>
              <select value={triggerMode} onChange={e => setTriggerMode(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid #d1d5db', backgroundColor: '#fff', outline: 'none' }}>
                <option value="rearm">Re-arm automatically (recommended)</option>
                <option value="once">Fire once, then deactivate</option>
                <option value="repeat">Repeat every 24 hours while triggered</option>
              </select>
            </div>
            {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: '12px 20px', borderRadius: 8, backgroundColor: creating ? '#6b7280' : '#1B4332', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: creating ? 'wait' : 'pointer' }}>
                {creating ? 'Creating...' : '🔔 Create Alert'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setError(''); }} style={{ padding: '12px 20px', borderRadius: 8, backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading alerts...</div>
      : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, backgroundColor: '#f9fafb', borderRadius: 14, border: '1px dashed #d1d5db' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔔</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>No alerts yet</p>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 16px' }}>Create your first price alert to get notified when prices move</p>
          <button onClick={() => setShowCreate(true)} style={{ backgroundColor: '#1B4332', color: '#fff', padding: '10px 24px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Create Your First Alert</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map(alert => {
            const info = getInfo(alert.commodity);
            return (
              <div key={alert.id} style={{ backgroundColor: '#fff', border: `1px solid ${alert.is_active ? '#e5e7eb' : '#f3f4f6'}`, borderRadius: 12, padding: 20, opacity: alert.is_active ? 1 : 0.6, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{info.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1B4332' }}>{info.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, backgroundColor: alert.is_active ? '#f0fdf4' : '#f3f4f6', color: alert.is_active ? '#16a34a' : '#9ca3af' }}>{alert.is_active ? 'Active' : 'Paused'}</span>
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                        {alert.condition === 'below' ? '▼' : '▲'} Alert when {alert.condition} <strong style={{ color: '#1B4332' }}>${parseFloat(String(alert.threshold)).toFixed(2)}</strong>{info.unit}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => toggleAlert(alert.id, alert.is_active)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>{alert.is_active ? '⏸ Pause' : '▶ Resume'}</button>
                    <button onClick={() => deleteAlert(alert.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fff', fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>✕</button>
                  </div>
                </div>
                {alert.last_triggered_at && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
                    Last triggered: {new Date(alert.last_triggered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {alert.last_notified_price && <> at ${parseFloat(String(alert.last_notified_price)).toFixed(2)}{info.unit}</>}
                    {alert.trigger_count ? ` (${alert.trigger_count}x)` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>💡 Prices from USDA NASS, checked every 6 hours. Free accounts: up to 3 alerts. Upgrade to Pro for unlimited.</p>
      </div>
    </div>
  );
}
