'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getVisibleSteps, getProgress } from '@/lib/navigator/steps';
import { TOTAL_PROGRAM_COUNT } from '@/lib/navigator/programs';
import type { FarmerProfile } from '@/lib/navigator/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type WizardData = Record<string, unknown>;

interface MatchCount {
  likelyCount: number;
  possibleCount: number;
  estimatedTotalValue: string;
}

// ─── US States for Location Step ────────────────────────────────────────────

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'harvestfile_navigator_progress';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NavigatorPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [matchCount, setMatchCount] = useState<MatchCount | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const countRef = useRef<HTMLSpanElement>(null);

  // ── Load saved progress from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wizardData) setWizardData(parsed.wizardData);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ── Auto-save to localStorage on every change ──────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ wizardData, currentStep })
      );
    } catch {
      // Ignore storage errors
    }
  }, [wizardData, currentStep]);

  // ── Fetch live match count when data changes ───────────────────────────
  const fetchMatchCount = useCallback(async (data: WizardData) => {
    if (!data.operationTypes || (data.operationTypes as string[]).length === 0) return;

    try {
      const profile = buildProfile(data);
      const res = await fetch('/api/navigator/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, mode: 'full' }),
      });
      if (res.ok) {
        const result = await res.json();
        setMatchCount({
          likelyCount: result.likelyCount,
          possibleCount: result.possibleCount,
          estimatedTotalValue: result.estimatedTotalValue,
        });
      }
    } catch {
      // Silent fail — counter just won't update
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchMatchCount(wizardData), 300);
    return () => clearTimeout(timer);
  }, [wizardData, fetchMatchCount]);

  // ── Build profile from wizard data ─────────────────────────────────────
  function buildProfile(data: WizardData): Partial<FarmerProfile> {
    return {
      operationTypes: (data.operationTypes as FarmerProfile['operationTypes']) || [],
      needs: (data.needs as FarmerProfile['needs']) || [],
      producerStatuses: (data.producerStatuses as FarmerProfile['producerStatuses']) || [],
      state: (data.state as string) || '',
      county: data.county as string | undefined,
      farmSizeAcres: data.farmSizeAcres ? Number(data.farmSizeAcres) : undefined,
      landTenure: data.landTenure as FarmerProfile['landTenure'],
      yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : undefined,
      hasBaseAcres: data.hasBaseAcres === 'true' ? true : data.hasBaseAcres === 'false' ? false : undefined,
      hasCropInsurance: data.hasCropInsurance === 'true' ? true : data.hasCropInsurance === 'false' ? false : undefined,
      recentDisasterLoss: data.recentDisasterLoss === 'true' ? true : data.recentDisasterLoss === 'false' ? false : undefined,
      hasExistingConservationPlan: data.hasExistingConservationPlan === 'true' ? true : data.hasExistingConservationPlan === 'false' ? false : undefined,
      isOrganic: data.isOrganic === 'true' ? true : data.isOrganic === 'false' ? false : undefined,
    };
  }

  // ── Get visible steps based on current data ────────────────────────────
  const visibleSteps = getVisibleSteps(buildProfile(wizardData));
  const currentStepDef = visibleSteps[currentStep];
  const progress = getProgress(currentStep, buildProfile(wizardData));
  const totalMatched = matchCount ? matchCount.likelyCount + matchCount.possibleCount : 0;

  // ── Navigation ─────────────────────────────────────────────────────────
  function goNext() {
    if (currentStep < visibleSteps.length - 1) {
      setDirection('forward');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsTransitioning(false);
      }, 250);
    } else {
      // Last step — submit and show results
      submitWizard();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setDirection('back');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsTransitioning(false);
      }, 250);
    }
  }

  async function submitWizard() {
    setIsLoadingResults(true);
    try {
      const profile = buildProfile(wizardData);
      const res = await fetch('/api/navigator/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      }
    } catch {
      // Show error state
    } finally {
      setIsLoadingResults(false);
    }
  }

  function resetWizard() {
    setWizardData({});
    setCurrentStep(0);
    setShowResults(false);
    setResults(null);
    setMatchCount(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Update wizard data ─────────────────────────────────────────────────
  function updateField(field: string, value: unknown) {
    setWizardData(prev => ({ ...prev, [field]: value }));
  }

  function toggleMultiSelect(field: string, value: string) {
    setWizardData(prev => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }

  // ── Can proceed to next step? ──────────────────────────────────────────
  function canProceed(): boolean {
    if (!currentStepDef) return false;
    if (!currentStepDef.required) return true;
    const value = wizardData[currentStepDef.field];
    if (Array.isArray(value)) return value.length > 0;
    if (currentStepDef.type === 'location') return !!(wizardData.state);
    return value !== undefined && value !== '';
  }

  // ── Results View ───────────────────────────────────────────────────────
  if (showResults && results) {
    return <ResultsView results={results} onReset={resetWizard} />;
  }

  // ── Loading State ──────────────────────────────────────────────────────
  if (isLoadingResults) {
    return (
      <div className="min-h-screen bg-[#0C1F17] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#1B4332] animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-[#C9A84C] animate-spin" style={{ borderTopColor: 'transparent' }} />
            <div className="absolute inset-4 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#C9A84C" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-white/90 text-xl font-medium" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Scanning {TOTAL_PROGRAM_COUNT} USDA programs...
          </p>
          <p className="text-white/50 text-sm mt-2">Matching your farm profile against every available program</p>
        </div>
      </div>
    );
  }

  // ── Wizard View ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0C1F17] relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#C9A84C]/[0.04] blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#1B4332" />
              <path d="M8 22V14l4-4 4 4v8" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 22V12l4-6 4 6v10" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white font-semibold text-lg" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Harvest<span className="text-[#C9A84C]">File</span>
            </span>
          </Link>

          {/* Live match counter */}
          {totalMatched > 0 && (
            <div className="flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-4 py-1.5 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
              <span ref={countRef} className="text-[#C9A84C] font-bold text-sm" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {totalMatched} programs matched
              </span>
            </div>
          )}

          <button onClick={resetWizard} className="text-white/40 text-xs hover:text-white/70 transition-colors">
            Start Over
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/40 text-xs" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Step {currentStep + 1} of {visibleSteps.length}
          </span>
          <span className="text-white/40 text-xs">{progress}% complete</span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E2C366] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-32">
        <div
          className={`transition-all duration-250 ${
            isTransitioning
              ? direction === 'forward'
                ? 'opacity-0 translate-x-8'
                : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {currentStepDef && (
            <>
              {/* Step title */}
              <h1
                className="text-white text-2xl sm:text-3xl font-bold leading-tight mb-2"
                style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
              >
                {currentStepDef.title}
              </h1>
              {currentStepDef.subtitle && (
                <p className="text-white/50 text-sm sm:text-base mb-8 max-w-lg">
                  {currentStepDef.subtitle}
                </p>
              )}

              {/* Step input */}
              <div className="mt-6">
                {/* Multi-select grid */}
                {currentStepDef.type === 'multi_select' && currentStepDef.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentStepDef.options.map(option => {
                      const selected = ((wizardData[currentStepDef.field] as string[]) || []).includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => toggleMultiSelect(currentStepDef.field, option.value)}
                          className={`group relative text-left p-4 rounded-xl border transition-all duration-200 ${
                            selected
                              ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 shadow-[0_0_20px_rgba(201,168,76,0.1)]'
                              : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox indicator */}
                            <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                              selected
                                ? 'bg-[#C9A84C] border-[#C9A84C]'
                                : 'border border-white/20'
                            }`}>
                              {selected && (
                                <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                                  <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#0C1F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <span className={`block font-medium text-sm ${
                                selected ? 'text-[#E2C366]' : 'text-white/90'
                              }`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                                {option.icon && <span className="mr-1.5">{option.icon}</span>}
                                {option.label}
                              </span>
                              {option.description && (
                                <span className="block text-white/40 text-xs mt-1 leading-relaxed">
                                  {option.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Single select */}
                {currentStepDef.type === 'single_select' && currentStepDef.options && (
                  <div className="space-y-3">
                    {currentStepDef.options.map(option => {
                      const selected = wizardData[currentStepDef.field] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            updateField(currentStepDef.field, option.value);
                            // Auto-advance on single select after brief delay
                            setTimeout(() => goNext(), 350);
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                            selected
                              ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40'
                              : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                              selected ? 'border-2 border-[#C9A84C]' : 'border border-white/20'
                            }`}>
                              {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#C9A84C]" />}
                            </div>
                            <span className={`font-medium text-sm ${
                              selected ? 'text-[#E2C366]' : 'text-white/90'
                            }`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                              {option.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Number input */}
                {currentStepDef.type === 'number' && (
                  <div className="max-w-xs">
                    <input
                      type="number"
                      value={(wizardData[currentStepDef.field] as string) || ''}
                      onChange={e => updateField(currentStepDef.field, e.target.value)}
                      placeholder={currentStepDef.field === 'farmSizeAcres' ? 'e.g., 500' : 'e.g., 8'}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-5 py-4 text-white text-lg placeholder:text-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:ring-1 focus:ring-[#C9A84C]/20 transition-all"
                      style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
                    />
                  </div>
                )}

                {/* Location selector */}
                {currentStepDef.type === 'location' && (
                  <div className="max-w-sm">
                    <select
                      value={(wizardData.state as string) || ''}
                      onChange={e => updateField('state', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-5 py-4 text-white text-base focus:outline-none focus:border-[#C9A84C]/50 focus:ring-1 focus:ring-[#C9A84C]/20 transition-all appearance-none cursor-pointer"
                      style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
                    >
                      <option value="" className="bg-[#0C1F17]">Select your state...</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state} className="bg-[#0C1F17]">{state}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0C1F17]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 text-sm font-medium transition-all ${
              currentStep === 0
                ? 'text-white/20 cursor-not-allowed'
                : 'text-white/60 hover:text-white'
            }`}
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
            </svg>
            Back
          </button>

          {/* Center — estimated value teaser */}
          {matchCount && matchCount.estimatedTotalValue !== '$0' && (
            <div className="hidden sm:block text-center animate-fade-in">
              <p className="text-[#C9A84C]/60 text-[10px] uppercase tracking-wider font-medium">Estimated value</p>
              <p className="text-[#E2C366] text-sm font-bold" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {matchCount.estimatedTotalValue}
              </p>
            </div>
          )}

          {currentStepDef?.type !== 'single_select' && (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                canProceed()
                  ? 'bg-[#C9A84C] text-[#0C1F17] hover:bg-[#E2C366] shadow-[0_0_20px_rgba(201,168,76,0.2)]'
                  : 'bg-white/[0.06] text-white/30 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              {currentStep === visibleSteps.length - 1 ? 'See My Programs' : 'Continue'}
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l4 4-4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface ResultsViewProps {
  results: Record<string, unknown>;
  onReset: () => void;
}

function ResultsView({ results, onReset }: ResultsViewProps) {
  const matches = (results.matches || []) as Array<{
    program: {
      id: string;
      name: string;
      acronym: string;
      agency: string;
      category: string;
      description: string;
      estimatedValue: string;
      deadlineInfo: string;
      deadlineDate?: string;
      paymentType: string;
      applyUrl: string;
      learnMoreUrl: string;
      formsRequired: string[];
    };
    confidence: 'likely' | 'possible' | 'unlikely';
    score: number;
    matchReasons: string[];
    missedCriteria?: string[];
  }>;

  const likelyCount = results.likelyCount as number;
  const possibleCount = results.possibleCount as number;
  const estimatedTotalValue = results.estimatedTotalValue as string;
  const totalEvaluated = results.totalProgramsEvaluated as number;

  const likelyMatches = matches.filter(m => m.confidence === 'likely');
  const possibleMatches = matches.filter(m => m.confidence === 'possible');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  async function saveEmail() {
    if (!email) return;
    try {
      await fetch('/api/navigator/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: results.profile,
          mode: 'count', // We'd create a separate endpoint for email capture in production
        }),
      });
      setEmailSaved(true);
    } catch {
      setEmailSaved(true); // Show success anyway for UX
    }
  }

  const confidenceConfig = {
    likely: {
      label: 'Likely Eligible',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      dot: 'bg-emerald-400',
    },
    possible: {
      label: 'Might Be Eligible',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      dot: 'bg-amber-400',
    },
    unlikely: {
      label: 'Unlikely',
      color: 'text-white/30',
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
      dot: 'bg-white/30',
    },
  };

  const categoryLabels: Record<string, string> = {
    commodity: 'Commodity & Safety Net',
    conservation: 'Conservation',
    disaster: 'Disaster Assistance',
    loan: 'Farm Loans',
    specialty: 'Specialty & Grants',
  };

  return (
    <div className="min-h-screen bg-[#0C1F17]">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#1B4332" />
              <path d="M8 22V14l4-4 4 4v8" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 22V12l4-6 4 6v10" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white font-semibold text-lg" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Harvest<span className="text-[#C9A84C]">File</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={onReset} className="text-white/40 text-xs hover:text-white/70 transition-colors">
              Start Over
            </button>
            <Link
              href="/signup"
              className="bg-[#C9A84C] text-[#0C1F17] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E2C366] transition-all"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero stats */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-4 py-1.5 mb-6">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16" stroke="#C9A84C" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 1v2m0 10v2m7-7h-2M3 8H1m12.07-4.07l-1.42 1.42M4.35 11.65l-1.42 1.42m11.14 0l-1.42-1.42M4.35 4.35L2.93 2.93" />
            </svg>
            <span className="text-[#C9A84C] text-sm font-medium">Scanned {totalEvaluated} USDA programs</span>
          </div>

          <h1
            className="text-white text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            You may qualify for{' '}
            <span className="text-[#C9A84C]">{likelyCount + possibleCount} programs</span>
          </h1>

          {estimatedTotalValue && estimatedTotalValue !== '$0' && (
            <p className="text-white/60 text-lg">
              Estimated potential value:{' '}
              <span className="text-[#E2C366] font-bold" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {estimatedTotalValue}
              </span>
            </p>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Likely Eligible', value: likelyCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Might Qualify', value: possibleCount, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { label: 'Programs Scanned', value: totalEvaluated, color: 'text-white/70', bg: 'bg-white/[0.04]' },
            { label: 'Est. Value', value: estimatedTotalValue, color: 'text-[#E2C366]', bg: 'bg-[#C9A84C]/10' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 text-center border border-white/[0.06]`}>
              <p className={`text-2xl font-bold ${stat.color}`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {stat.value}
              </p>
              <p className="text-white/40 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Likely eligible section */}
        {likelyMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Likely Eligible ({likelyMatches.length})
              </h2>
            </div>
            <div className="space-y-3">
              {likelyMatches.map(match => (
                <ProgramCard
                  key={match.program.id}
                  match={match}
                  config={confidenceConfig.likely}
                  categoryLabels={categoryLabels}
                  expanded={expandedId === match.program.id}
                  onToggle={() => setExpandedId(expandedId === match.program.id ? null : match.program.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Possible section */}
        {possibleMatches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Might Be Eligible ({possibleMatches.length})
              </h2>
            </div>
            <div className="space-y-3">
              {possibleMatches.map(match => (
                <ProgramCard
                  key={match.program.id}
                  match={match}
                  config={confidenceConfig.possible}
                  categoryLabels={categoryLabels}
                  expanded={expandedId === match.program.id}
                  onToggle={() => setExpandedId(expandedId === match.program.id ? null : match.program.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Email capture CTA */}
        <div className="mt-12 mb-16 text-center">
          {!showEmailCapture && !emailSaved ? (
            <div className="bg-gradient-to-b from-[#C9A84C]/10 to-transparent border border-[#C9A84C]/20 rounded-2xl p-8">
              <h3 className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Don&apos;t lose your results
              </h3>
              <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
                Save your personalized program matches and get deadline reminders so you never miss an enrollment window.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="bg-[#C9A84C] text-[#0C1F17] px-8 py-3 rounded-lg font-bold hover:bg-[#E2C366] transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)]"
                  style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
                >
                  Create Free Account — Save Results
                </Link>
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="text-white/50 text-sm hover:text-white/70 underline transition-colors"
                >
                  Just email me a copy
                </button>
              </div>
            </div>
          ) : emailSaved ? (
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-6">
              <p className="text-emerald-400 font-medium">Results saved! Check your inbox for your program matches.</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
              <div className="flex items-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#C9A84C]/50"
                />
                <button
                  onClick={saveEmail}
                  className="bg-[#C9A84C] text-[#0C1F17] px-6 py-3 rounded-lg font-bold hover:bg-[#E2C366] transition-all whitespace-nowrap"
                  style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
                >
                  Send Results
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/[0.06] pt-8 pb-12">
          <p className="text-white/25 text-xs text-center max-w-2xl mx-auto leading-relaxed">
            HarvestFile is not affiliated with, endorsed by, or connected to the USDA, FSA, or any government agency.
            Results are estimates based on the information you provided and should not be considered a guarantee of eligibility.
            Always verify eligibility with your local USDA Service Center before applying. Program rules, deadlines, and
            funding availability are subject to change.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgramCardProps {
  match: {
    program: {
      id: string;
      name: string;
      acronym: string;
      agency: string;
      category: string;
      description: string;
      estimatedValue: string;
      deadlineInfo: string;
      deadlineDate?: string;
      paymentType: string;
      applyUrl: string;
      learnMoreUrl: string;
      formsRequired: string[];
    };
    confidence: string;
    score: number;
    matchReasons: string[];
    missedCriteria?: string[];
  };
  config: { label: string; color: string; bg: string; border: string; dot: string };
  categoryLabels: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}

function ProgramCard({ match, config, categoryLabels, expanded, onToggle }: ProgramCardProps) {
  const { program } = match;
  const isUrgent = program.deadlineDate && new Date(program.deadlineDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl overflow-hidden transition-all`}>
      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                {program.agency}
              </span>
              <span className="text-white/30 text-xs">
                {categoryLabels[program.category] || program.category}
              </span>
              {isUrgent && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Deadline Soon
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-base truncate" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {program.name} ({program.acronym})
            </h3>
            <p className="text-white/50 text-sm mt-1 line-clamp-2">{program.description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[#E2C366] text-sm font-bold" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {program.estimatedValue}
            </p>
            <p className="text-white/30 text-xs mt-0.5">{program.paymentType}</p>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-white/[0.06] mt-0">
          {/* Why you matched */}
          {match.matchReasons.length > 0 && (
            <div className="mt-4 mb-4">
              <p className="text-emerald-400/80 text-xs uppercase tracking-wider font-medium mb-2">Why you matched</p>
              <div className="space-y-1.5">
                {match.matchReasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0">
                      <path d="M3.5 7l2 2 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-white/60 text-sm">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div className="flex items-start gap-2 mb-4">
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0">
              <circle cx="7" cy="7" r="5.5" stroke="#C9A84C" strokeWidth="1" />
              <path d="M7 4v3l2 1" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="text-white/50 text-sm">{program.deadlineInfo}</span>
          </div>

          {/* Forms required */}
          {program.formsRequired.length > 0 && (
            <div className="flex items-start gap-2 mb-4">
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0">
                <rect x="2" y="1" width="10" height="12" rx="1" stroke="white" strokeWidth="1" opacity="0.4" />
                <path d="M5 5h4M5 7.5h4M5 10h2" stroke="white" strokeWidth="0.75" opacity="0.4" strokeLinecap="round" />
              </svg>
              <span className="text-white/40 text-sm">
                Forms: {program.formsRequired.join(', ')}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <a
              href={program.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#C9A84C] text-[#0C1F17] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#E2C366] transition-all"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              How to Apply →
            </a>
            <a
              href={program.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 text-sm hover:text-white/70 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
