// app/onboard/OnboardForm.tsx
// =============================================================================
// HarvestFile Sell Score — Onboarding Form (client component)
//
// Four fields, single page, no wizard. Submit posts to /api/onboard/submit
// which handles ZIP→county lookup, finds nearest elevator via getGrainBids,
// and marks the farm as setup-complete. On success, redirects to /dashboard.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardFormProps {
  farmId: string;
  defaultFarmName: string;
  userEmail: string;
}

const CROPS = [
  { id: 'corn', label: 'Corn', defaultSelected: true },
  { id: 'soybeans', label: 'Soybeans', defaultSelected: true },
  { id: 'wheat', label: 'Wheat', defaultSelected: false },
  { id: 'sorghum', label: 'Sorghum', defaultSelected: false },
] as const;

export default function OnboardForm({
  farmId,
  defaultFarmName,
  userEmail,
}: OnboardFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [farmName, setFarmName] = useState(defaultFarmName);
  const [zipCode, setZipCode] = useState('');
  const [totalAcres, setTotalAcres] = useState('');
  const [crops, setCrops] = useState<string[]>(
    CROPS.filter((c) => c.defaultSelected).map((c) => c.id)
  );
  const [error, setError] = useState<string | null>(null);

  const toggleCrop = (id: string) => {
    setCrops((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!farmName.trim()) {
      setError('Farm name is required.');
      return;
    }
    if (!/^\d{5}$/.test(zipCode.trim())) {
      setError('Enter a 5-digit ZIP code.');
      return;
    }
    const acresNum = parseFloat(totalAcres);
    if (isNaN(acresNum) || acresNum <= 0 || acresNum > 100000) {
      setError('Enter a number between 1 and 100,000 for total acres.');
      return;
    }
    if (crops.length === 0) {
      setError('Select at least one crop.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/onboard/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId,
            farmName: farmName.trim(),
            zipCode: zipCode.trim(),
            totalAcres: acresNum,
            crops,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Something went wrong. Please try again.');
          return;
        }

        // Success — go to dashboard
        router.push('/sellscore/me');
        router.refresh();
      } catch (err) {
        console.error('[OnboardForm] submit error:', err);
        setError('Network error. Please check your connection and try again.');
      }
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f0d',
        padding: '40px 20px',
        fontFamily:
          '"Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: 'rgba(232, 240, 235, 0.50)',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Set up your farm · Step 1 of 1
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 500,
            color: '#E8F0EB',
            letterSpacing: '-0.026em',
            lineHeight: 1.1,
            marginBottom: '12px',
            maxWidth: '20ch',
          }}
        >
          Tell us about your farm.
        </h1>

        <p
          style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic',
            fontSize: '18px',
            color: 'rgba(232, 240, 235, 0.65)',
            marginBottom: '40px',
            letterSpacing: '-0.005em',
            lineHeight: 1.45,
          }}
        >
          Four fields. Three minutes. Your first Sell Score is ready when
          you're done.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Farm Name */}
          <Field
            label="Farm name"
            id="farmName"
            hint="What you call your farm. Show up on emails and reports."
          >
            <input
              id="farmName"
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              autoComplete="off"
              maxLength={64}
              style={inputStyle}
            />
          </Field>

          {/* ZIP code */}
          <Field
            label="ZIP code"
            id="zipCode"
            hint="Your farm's nearest ZIP. We use it to find your county and the elevators near you."
          >
            <input
              id="zipCode"
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              value={zipCode}
              onChange={(e) =>
                setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))
              }
              autoComplete="postal-code"
              style={inputStyle}
            />
          </Field>

          {/* Total Acres */}
          <Field
            label="Total acres"
            id="totalAcres"
            hint="Total tillable acres across all your fields."
          >
            <input
              id="totalAcres"
              type="text"
              inputMode="decimal"
              value={totalAcres}
              onChange={(e) =>
                setTotalAcres(e.target.value.replace(/[^0-9.]/g, ''))
              }
              autoComplete="off"
              style={inputStyle}
            />
          </Field>

          {/* Crops */}
          <Field
            label="Primary crops"
            id="crops"
            hint="Select all that you grow. You can change this later."
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {CROPS.map((crop) => {
                const selected = crops.includes(crop.id);
                return (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => toggleCrop(crop.id)}
                    style={{
                      padding: '12px 22px',
                      borderRadius: '12px',
                      border: selected
                        ? '1px solid #34D399'
                        : '1px solid rgba(255, 255, 255, 0.10)',
                      backgroundColor: selected
                        ? 'rgba(52, 211, 153, 0.10)'
                        : 'transparent',
                      color: selected ? '#34D399' : 'rgba(232, 240, 235, 0.70)',
                      fontSize: '15px',
                      fontWeight: 600,
                      letterSpacing: '-0.005em',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 160ms ease-out',
                    }}
                  >
                    {crop.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Error */}
          {error && (
            <div
              role="alert"
              style={{
                marginTop: '24px',
                padding: '14px 18px',
                backgroundColor: 'rgba(249, 115, 22, 0.10)',
                border: '1px solid rgba(249, 115, 22, 0.30)',
                borderRadius: '10px',
                color: '#F97316',
                fontSize: '14px',
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: '36px',
              width: '100%',
              minHeight: '56px',
              padding: '0 28px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: isPending
                ? 'rgba(52, 211, 153, 0.40)'
                : '#34D399',
              color: '#0a0f0d',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.005em',
              cursor: isPending ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 180ms ease-out',
            }}
          >
            {isPending ? 'Setting up your farm...' : 'Get my first Sell Score →'}
          </button>

          <p
            style={{
              marginTop: '20px',
              fontSize: '13px',
              color: 'rgba(232, 240, 235, 0.40)',
              textAlign: 'center',
              lineHeight: 1.55,
            }}
          >
            Logged in as <span style={{ color: 'rgba(232, 240, 235, 0.65)' }}>{userEmail}</span>
          </p>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: 'rgba(232, 240, 235, 0.85)',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}
      >
        {label}
      </label>
      {children}
      <p
        style={{
          marginTop: '8px',
          marginBottom: 0,
          fontSize: '13px',
          color: 'rgba(232, 240, 235, 0.50)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {hint}
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '56px',
  padding: '0 18px',
  fontSize: '17px',
  fontFamily: 'inherit',
  fontWeight: 500,
  color: '#E8F0EB',
  backgroundColor: '#131918',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  borderRadius: '12px',
  outline: 'none',
  letterSpacing: '-0.005em',
};
