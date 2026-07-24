// components/sellscore/SettingsFarmData.tsx
// =============================================================================
// Sell Score Settings — farm-data controls (client, Round 2 Item 4)
//
// The spec v6.6 §5 settings scope: per-crop breakeven (with the §5.4
// "county default" vs "your number" source indicator), expected bushels,
// unsold/contracted position correction, pinned elevator management
// (2 pins per the v1 lock), and county.
//
// Three cards, each with its own Save button so a farmer can change one
// thing without understanding the whole page. All saves POST to
// /api/sellscore/settings; the server validates and clamps again — the
// client-side bounds exist for immediate plain-language feedback, not as
// the enforcement layer. On success we router.refresh() so the
// server-rendered values (and /sellscore/me on next view, via the §5.3
// recompute) reflect what was saved.
//
// Round 2 review fixes (July 24, 2026):
//   - parseBushels rejects decimals/signs instead of silently mangling
//     them ("1500.5" is an error, not 15005); parseDollars rejects
//     comma-decimals ("2,5" is an error, not $25).
//   - Over-priced position names the violation inline, in error tone,
//     instead of a red "Leaves 0 bu unsold."
//   - "Use county default" no longer disables the input — typing again
//     switches straight back to a custom number.
//   - Pin/Unpin/Make-primary buttons carry per-elevator accessible
//     names; the saved note announces via role="status".
//
// Typography/touch rules for the 58+ demographic: 18px body floor,
// 48px+ touch targets (inputs and buttons here are 56px).
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, fonts, formatters, tabularNums } from './_tokens';

// ─────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────

export interface CropSettingsDisplay {
  crop: string;
  crop_year: number;
  expected_bushels: number;
  bushels_contracted: number;
  breakeven_dollars_per_bu: number;
  breakeven_source: string;
  /** The county-default breakeven for this crop, for the reset affordance */
  county_default_breakeven: number;
}

export interface ElevatorOptionDisplay {
  barchart_elevator_id: string;
  name: string;
  city: string;
  state: string;
  distance_miles: number | null;
  pinned: boolean;
  is_primary: boolean;
}

export interface CountyOptionDisplay {
  county_fips: string;
  /** e.g. "Wood County, OH" */
  label: string;
}

interface SettingsFarmDataProps {
  positions: CropSettingsDisplay[];
  countyFips: string | null;
  countyOptions: CountyOptionDisplay[];
  /** Pinned rows first, then nearby elevators available to pin */
  elevators: ElevatorOptionDisplay[];
}

const CROP_LABELS: Record<string, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  wheat: 'Wheat',
  sorghum: 'Sorghum',
};

// Mirror of the server bounds in app/api/sellscore/settings/route.ts.
const BREAKEVEN_MIN = 1;
const BREAKEVEN_MAX = 30;
const EXPECTED_MIN = 1;
const EXPECTED_MAX = 10_000_000;
const MAX_PINS = 2;

// ─────────────────────────────────────────────────────────────────────────
// Shared save plumbing
// ─────────────────────────────────────────────────────────────────────────

type SaveState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved' }
  | { phase: 'error'; message: string };

async function postSettings(payload: unknown): Promise<string | null> {
  try {
    const res = await fetch('/api/sellscore/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return typeof json.error === 'string'
        ? json.error
        : 'Could not save. Try again.';
    }
    return null;
  } catch {
    return 'Could not reach the server. Check your connection and try again.';
  }
}

/**
 * Whole bushels only. Commas and spaces are fine ("50,000"); anything
 * else — decimals, minus signs, letters — returns null so the farmer
 * gets a plain-language error instead of a silently mangled number
 * ("1500.5" must never save as 15005).
 */
function parseBushels(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Dollars and cents, period decimal only ("4.60"). A leading $ and
 * spaces are fine. Commas return null — in a ≤$30 field a comma is
 * always a mistyped decimal ("2,5" must never save as $25).
 */
function parseDollars(text: string): number | null {
  const cleaned = text.replace(/[$\s]/g, '');
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function SettingsFarmData({
  positions,
  countyFips,
  countyOptions,
  elevators,
}: SettingsFarmDataProps) {
  return (
    <>
      {positions.length > 0 && <FarmDataCard positions={positions} />}
      {countyOptions.length > 0 && (
        <CountyCard countyFips={countyFips} countyOptions={countyOptions} />
      )}
      {elevators.length > 0 && <ElevatorsCard elevators={elevators} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card 1 — per-crop farm data (breakeven, expected, position correction)
// ─────────────────────────────────────────────────────────────────────────

interface CropDraft {
  expectedText: string;
  contractedText: string;
  breakevenText: string;
  /** Set when the farmer taps "Use county default"; typing clears it. */
  resetBreakeven: boolean;
}

function FarmDataCard({ positions }: { positions: CropSettingsDisplay[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, CropDraft>>(() =>
    Object.fromEntries(
      positions.map((p) => [
        p.crop,
        {
          expectedText: p.expected_bushels.toLocaleString('en-US'),
          contractedText: p.bushels_contracted.toLocaleString('en-US'),
          breakevenText: p.breakeven_dollars_per_bu.toFixed(2),
          resetBreakeven: false,
        },
      ]),
    ),
  );
  const [save, setSave] = useState<SaveState>({ phase: 'idle' });

  const updateDraft = (crop: string, next: Partial<CropDraft>) => {
    setDrafts((d) => ({ ...d, [crop]: { ...d[crop], ...next } }));
    setSave({ phase: 'idle' });
  };

  // Validate every crop's draft; first plain-language problem wins.
  const validationError = useMemo((): string | null => {
    for (const p of positions) {
      const d = drafts[p.crop];
      if (!d) continue;
      const label = CROP_LABELS[p.crop] ?? p.crop;

      const expected = parseBushels(d.expectedText);
      if (expected === null) {
        return `${label}: expected bushels should be a whole number, like 50,000`;
      }
      if (expected < EXPECTED_MIN || expected > EXPECTED_MAX) {
        return `${label}: expected bushels must be between ${EXPECTED_MIN.toLocaleString('en-US')} and ${EXPECTED_MAX.toLocaleString('en-US')}`;
      }

      const contracted = parseBushels(d.contractedText);
      if (contracted === null) {
        return `${label}: bushels already priced should be a whole number (0 is fine)`;
      }
      if (contracted > expected) {
        return `${label}: bushels already priced can't be more than expected bushels`;
      }

      if (!d.resetBreakeven) {
        const breakeven = parseDollars(d.breakevenText);
        if (breakeven === null) {
          return `${label}: breakeven should be a price like 4.60`;
        }
        if (breakeven < BREAKEVEN_MIN || breakeven > BREAKEVEN_MAX) {
          return `${label}: breakeven must be between $${BREAKEVEN_MIN.toFixed(2)} and $${BREAKEVEN_MAX.toFixed(2)} per bushel`;
        }
      }
    }
    return null;
  }, [drafts, positions]);

  const handleSave = async () => {
    if (save.phase === 'saving') return;
    if (validationError) {
      setSave({ phase: 'error', message: validationError });
      return;
    }

    const patches = positions
      .map((p) => {
        const d = drafts[p.crop];
        if (!d) return null;
        const expected = parseBushels(d.expectedText)!;
        const contracted = parseBushels(d.contractedText)!;
        const patch: Record<string, unknown> = { crop: p.crop };
        let dirty = false;
        if (expected !== p.expected_bushels) {
          patch.expected_bushels = expected;
          dirty = true;
        }
        if (contracted !== p.bushels_contracted) {
          patch.bushels_contracted = contracted;
          dirty = true;
        }
        if (d.resetBreakeven) {
          if (p.breakeven_source !== 'county_default') {
            patch.breakeven_reset = true;
            dirty = true;
          }
        } else {
          // Only count it as a change when the number actually moved;
          // retyping the county default verbatim shouldn't flip the
          // source indicator to "your number".
          const breakeven = parseDollars(d.breakevenText)!;
          if (breakeven !== p.breakeven_dollars_per_bu) {
            patch.breakeven_dollars_per_bu = breakeven;
            dirty = true;
          }
        }
        return dirty ? patch : null;
      })
      .filter(Boolean);

    if (patches.length === 0) {
      setSave({ phase: 'saved' });
      return;
    }

    setSave({ phase: 'saving' });
    const failure = await postSettings({ positions: patches });
    if (failure) {
      setSave({ phase: 'error', message: failure });
      return;
    }
    setSave({ phase: 'saved' });
    router.refresh();
  };

  return (
    <SettingsCard
      title="Farm data"
      subtitle="These numbers drive your Sell Score. Saving updates your score for the next time you check it."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {positions.map((p) => {
          const d = drafts[p.crop];
          if (!d) return null;
          const label = CROP_LABELS[p.crop] ?? p.crop;
          const expected = parseBushels(d.expectedText);
          const contracted = parseBushels(d.contractedText);
          const overPriced =
            expected !== null && contracted !== null && contracted > expected;
          const unsold =
            expected !== null && contracted !== null
              ? Math.max(0, expected - contracted)
              : null;

          const draftBreakeven = parseDollars(d.breakevenText);
          const usingDefault =
            d.resetBreakeven ||
            (p.breakeven_source === 'county_default' &&
              draftBreakeven === p.breakeven_dollars_per_bu);
          const editedBreakeven =
            !d.resetBreakeven &&
            draftBreakeven !== null &&
            draftBreakeven !== p.breakeven_dollars_per_bu;

          return (
            <div key={p.crop}>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(232, 240, 235, 0.70)',
                  fontFamily: fonts.body,
                  margin: 0,
                  marginBottom: '14px',
                }}
              >
                {label} · {p.crop_year} crop
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <LabeledInput
                  id={`expected-${p.crop}`}
                  label="Expected bushels"
                  value={d.expectedText}
                  inputMode="numeric"
                  onChange={(v) => updateDraft(p.crop, { expectedText: v })}
                  helper="Your best estimate of this year's total production."
                />

                <LabeledInput
                  id={`contracted-${p.crop}`}
                  label="Bushels already priced"
                  value={d.contractedText}
                  inputMode="numeric"
                  onChange={(v) => updateDraft(p.crop, { contractedText: v })}
                  helper={
                    overPriced
                      ? "Bushels already priced can't be more than expected bushels."
                      : unsold !== null
                        ? `Leaves ${formatters.bushels(unsold)} bu unsold.`
                        : 'Bushels you’ve contracted or sold so far this year.'
                  }
                  helperTone={overPriced ? 'error' : 'normal'}
                />

                <div>
                  <LabeledInput
                    id={`breakeven-${p.crop}`}
                    label="Breakeven ($ per bushel)"
                    value={d.breakevenText}
                    inputMode="decimal"
                    onChange={(v) =>
                      updateDraft(p.crop, { breakevenText: v, resetBreakeven: false })
                    }
                    helper={
                      d.resetBreakeven
                        ? `Source: county default ($${p.county_default_breakeven.toFixed(2)}). Type to use your own number instead.`
                        : usingDefault
                          ? `Source: county default ($${p.county_default_breakeven.toFixed(2)}). Enter your own number any time.`
                          : editedBreakeven
                            ? 'Will save as your number.'
                            : 'Source: your number.'
                    }
                  />
                  {!usingDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft(p.crop, {
                          resetBreakeven: true,
                          breakevenText: p.county_default_breakeven.toFixed(2),
                        })
                      }
                      style={{
                        marginTop: '10px',
                        minHeight: '48px',
                        padding: '0 18px',
                        borderRadius: '12px',
                        backgroundColor: 'transparent',
                        color: colors.textSecondary,
                        border: `1px solid ${colors.borderDefault}`,
                        fontFamily: fonts.body,
                        fontWeight: 500,
                        fontSize: '18px',
                        letterSpacing: '-0.005em',
                        cursor: 'pointer',
                      }}
                    >
                      Use county default (${p.county_default_breakeven.toFixed(2)})
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SaveRow
        state={save}
        onSave={handleSave}
        label="Save farm data"
        savedNote="Saved. Your Sell Score will reflect this the next time it's computed."
      />
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card 2 — county
// ─────────────────────────────────────────────────────────────────────────

function CountyCard({
  countyFips,
  countyOptions,
}: {
  countyFips: string | null;
  countyOptions: CountyOptionDisplay[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(countyFips ?? '');
  const [save, setSave] = useState<SaveState>({ phase: 'idle' });

  const handleSave = async () => {
    if (save.phase === 'saving') return;
    if (!selected) {
      setSave({ phase: 'error', message: 'Pick a county from the list' });
      return;
    }
    if (selected === countyFips) {
      setSave({ phase: 'saved' });
      return;
    }
    setSave({ phase: 'saving' });
    const failure = await postSettings({ county_fips: selected });
    if (failure) {
      setSave({ phase: 'error', message: failure });
      return;
    }
    setSave({ phase: 'saved' });
    router.refresh();
  };

  return (
    <SettingsCard
      title="County"
      subtitle="Your county sets which local elevator prices and basis history your Sell Score uses."
    >
      <label
        htmlFor="settings-county"
        style={{
          display: 'block',
          fontSize: '18px',
          fontWeight: 500,
          color: 'rgba(232, 240, 235, 0.55)',
          fontFamily: fonts.body,
          letterSpacing: '-0.005em',
          marginBottom: '8px',
        }}
      >
        County
      </label>
      <select
        id="settings-county"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setSave({ phase: 'idle' });
        }}
        style={{
          width: '100%',
          height: '56px',
          padding: '0 16px',
          borderRadius: '12px',
          fontSize: '18px',
          fontFamily: fonts.body,
          fontWeight: 500,
          color: colors.textPrimary,
          backgroundColor: colors.pageBg,
          border: `1px solid ${colors.borderDefault}`,
        }}
      >
        {!countyFips && <option value="">Pick your county…</option>}
        {countyOptions.map((c) => (
          <option key={c.county_fips} value={c.county_fips}>
            {c.label}
          </option>
        ))}
      </select>

      <SaveRow
        state={save}
        onSave={handleSave}
        label="Save county"
        savedNote="Saved. Your Sell Score will use this county's market from now on."
      />
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card 3 — pinned elevators (2 per v1 lock)
// ─────────────────────────────────────────────────────────────────────────

function ElevatorsCard({ elevators }: { elevators: ElevatorOptionDisplay[] }) {
  const router = useRouter();
  const initialPinned = elevators
    .filter((e) => e.pinned)
    .map((e) => e.barchart_elevator_id);
  const initialPrimary =
    elevators.find((e) => e.is_primary)?.barchart_elevator_id ??
    initialPinned[0] ??
    null;

  const [pinnedIds, setPinnedIds] = useState<string[]>(initialPinned);
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimary);
  const [save, setSave] = useState<SaveState>({ phase: 'idle' });

  const togglePin = (id: string) => {
    setSave({ phase: 'idle' });
    setPinnedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((p) => p !== id);
        if (primaryId === id) setPrimaryId(next[0] ?? null);
        return next;
      }
      if (current.length >= MAX_PINS) return current;
      const next = [...current, id];
      if (!primaryId) setPrimaryId(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (save.phase === 'saving') return;
    if (pinnedIds.length === 0) {
      setSave({ phase: 'error', message: 'Keep at least one elevator pinned' });
      return;
    }
    setSave({ phase: 'saving' });
    const failure = await postSettings({
      pinned_elevators: pinnedIds.map((id) => ({
        barchart_elevator_id: id,
        is_primary: id === (primaryId ?? pinnedIds[0]),
      })),
    });
    if (failure) {
      setSave({ phase: 'error', message: failure });
      return;
    }
    setSave({ phase: 'saved' });
    router.refresh();
  };

  const atCap = pinnedIds.length >= MAX_PINS;

  return (
    <SettingsCard
      title="Your elevators"
      subtitle={`Pin up to ${MAX_PINS} elevators to compare on your score screen. Your primary elevator is the one your score screen features.`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {elevators.map((e) => {
          const isPinned = pinnedIds.includes(e.barchart_elevator_id);
          const isPrimary =
            isPinned && e.barchart_elevator_id === (primaryId ?? pinnedIds[0]);
          const pinDisabled = !isPinned && atCap;

          return (
            <div
              key={e.barchart_elevator_id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1px solid ${isPinned ? 'rgba(52, 211, 153, 0.45)' : colors.borderSubtle}`,
                backgroundColor: isPinned ? 'rgba(52, 211, 153, 0.06)' : 'transparent',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: colors.textPrimary,
                    fontFamily: fonts.body,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {e.name}
                  {isPrimary && (
                    <span
                      style={{
                        marginLeft: '10px',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: colors.emerald,
                      }}
                    >
                      · Primary
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 400,
                    color: colors.textTertiary,
                    fontFamily: fonts.body,
                    ...tabularNums,
                  }}
                >
                  {e.city}
                  {e.city && e.state ? ', ' : ''}
                  {e.state}
                  {e.distance_miles != null
                    ? ` · ${Math.round(e.distance_miles)} mi`
                    : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isPinned && !isPrimary && (
                  <button
                    type="button"
                    aria-label={`Make ${e.name} your primary elevator`}
                    onClick={() => {
                      setPrimaryId(e.barchart_elevator_id);
                      setSave({ phase: 'idle' });
                    }}
                    style={{
                      minHeight: '48px',
                      padding: '0 16px',
                      borderRadius: '12px',
                      backgroundColor: 'transparent',
                      color: colors.textSecondary,
                      border: `1px solid ${colors.borderDefault}`,
                      fontFamily: fonts.body,
                      fontWeight: 500,
                      fontSize: '18px',
                      cursor: 'pointer',
                    }}
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => togglePin(e.barchart_elevator_id)}
                  disabled={pinDisabled}
                  aria-label={isPinned ? `Unpin ${e.name}` : `Pin ${e.name}`}
                  style={{
                    minHeight: '48px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    backgroundColor: isPinned ? 'transparent' : colors.emeraldGlow,
                    color: pinDisabled
                      ? colors.textMuted
                      : isPinned
                        ? colors.textSecondary
                        : colors.emerald,
                    border: isPinned
                      ? `1px solid ${colors.borderDefault}`
                      : `1px solid rgba(52, 211, 153, 0.45)`,
                    fontFamily: fonts.body,
                    fontWeight: 600,
                    fontSize: '18px',
                    cursor: pinDisabled ? 'default' : 'pointer',
                  }}
                >
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {atCap && (
        <p
          style={{
            marginTop: '12px',
            marginBottom: 0,
            fontSize: '18px',
            color: colors.textTertiary,
            fontFamily: fonts.body,
          }}
        >
          Two elevators pinned — unpin one to swap in another.
        </p>
      )}

      <SaveRow
        state={save}
        onSave={handleSave}
        label="Save elevators"
        savedNote="Saved. Your score screen comparison updates right away."
      />
    </SettingsCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared UI pieces
// ─────────────────────────────────────────────────────────────────────────

function SettingsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: '24px',
        padding: '24px 20px',
        backgroundColor: '#131918',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '14px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#E8F0EB',
          margin: 0,
          marginBottom: subtitle ? '8px' : '18px',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '18px',
            color: 'rgba(232, 240, 235, 0.65)',
            lineHeight: 1.5,
            margin: 0,
            marginBottom: '20px',
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}

function LabeledInput({
  id,
  label,
  value,
  onChange,
  helper,
  helperTone = 'normal',
  inputMode = 'numeric',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  helperTone?: 'normal' | 'error';
  inputMode?: 'numeric' | 'decimal';
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '18px',
          fontWeight: 500,
          color: 'rgba(232, 240, 235, 0.55)',
          fontFamily: fonts.body,
          letterSpacing: '-0.005em',
          marginBottom: '8px',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: '56px',
          padding: '0 16px',
          borderRadius: '12px',
          fontSize: '20px',
          fontFamily: fonts.body,
          fontWeight: 500,
          ...tabularNums,
          color: colors.textPrimary,
          backgroundColor: colors.pageBg,
          border: `1px solid ${colors.borderDefault}`,
        }}
      />
      {helper && (
        <p
          style={{
            marginTop: '8px',
            marginBottom: 0,
            fontSize: '18px',
            lineHeight: 1.45,
            color: helperTone === 'error' ? colors.warmRed : colors.textTertiary,
            fontFamily: fonts.body,
            ...tabularNums,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}

function SaveRow({
  state,
  onSave,
  label,
  savedNote,
}: {
  state: SaveState;
  onSave: () => void;
  label: string;
  savedNote: string;
}) {
  const saving = state.phase === 'saving';
  return (
    <div style={{ marginTop: '22px' }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          minHeight: '56px',
          width: '100%',
          padding: '0 24px',
          borderRadius: '12px',
          backgroundColor: saving ? 'rgba(52, 211, 153, 0.25)' : colors.emerald,
          color: saving ? 'rgba(10, 15, 13, 0.7)' : '#0a0f0d',
          border: '1px solid transparent',
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: '18px',
          letterSpacing: '-0.005em',
          cursor: saving ? 'default' : 'pointer',
          transition: 'background-color 180ms ease-out',
        }}
      >
        {saving ? 'Saving…' : label}
      </button>

      {state.phase === 'error' && (
        <p
          role="alert"
          style={{
            marginTop: '12px',
            marginBottom: 0,
            fontSize: '18px',
            lineHeight: 1.45,
            color: colors.warmRed,
            fontFamily: fonts.body,
            fontWeight: 500,
          }}
        >
          {state.message}
        </p>
      )}
      {state.phase === 'saved' && (
        <p
          role="status"
          style={{
            marginTop: '12px',
            marginBottom: 0,
            fontSize: '18px',
            lineHeight: 1.45,
            color: colors.emerald,
            fontFamily: fonts.body,
            fontWeight: 500,
          }}
        >
          {savedNote}
        </p>
      )}
    </div>
  );
}
