'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import ScreenerStep from '@/components/ScreenerStep';
import {
  STATES,
  CROP_OPTIONS,
  USDA_PROGRAM_OPTIONS,
  CONSERVATION_PRACTICES,
  FARMER_STATUS_OPTIONS,
  COVERAGE_LEVELS,
} from '@/lib/constants';

interface FormData {
  state: string;
  county: string;
  totalAcres: number | '';
  crops: string[];
  cropAcres: Record<string, number>;
  hasBaseAcres: string;
  baseAcresAmount: number | '';
  currentPrograms: string[];
  conservationPractices: string[];
  farmerStatus: string[];
  hasCropInsurance: string;
  coverageLevel: string;
  hasScoEco: string;
  agiUnder900k: string;
  income75Farming: string;
  email: string;
  firstName: string;
  wantsUpdates: boolean;
}

const TOTAL_STEPS = 10;

const inputClass =
  'w-full border border-gray-300 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white';

export default function ScreenerPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    state: '',
    county: '',
    totalAcres: '',
    crops: [],
    cropAcres: {},
    hasBaseAcres: '',
    baseAcresAmount: '',
    currentPrograms: [],
    conservationPractices: [],
    farmerStatus: [],
    hasCropInsurance: '',
    coverageLevel: '',
    hasScoEco: '',
    agiUnder900k: '',
    income75Farming: '',
    email: '',
    firstName: '',
    wantsUpdates: true,
  });

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof FormData, value: string) => {
    setFormData((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Email capture:', formData.email, formData.firstName, formData.wantsUpdates);
    const encoded = btoa(JSON.stringify(formData));
    router.push(`/results?d=${encodeURIComponent(encoded)}`);
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.state !== '';
      case 2:
        return formData.totalAcres !== '' && Number(formData.totalAcres) > 0;
      case 3:
        return formData.crops.length > 0;
      case 10:
        return (
          formData.email.trim() !== '' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
          formData.firstName.trim() !== ''
        );
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      /* ───── Step 1: Location ───── */
      case 1:
        return (
          <ScreenerStep title="Where is your farm located?">
            <div className="space-y-4">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-foreground mb-1">
                  State
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select your state
                  </option>
                  {STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="county" className="block text-sm font-medium text-foreground mb-1">
                  County
                </label>
                <input
                  id="county"
                  type="text"
                  value={formData.county}
                  onChange={(e) => updateField('county', e.target.value)}
                  placeholder="e.g., Story County"
                  className={inputClass}
                />
              </div>
            </div>
          </ScreenerStep>
        );

      /* ───── Step 2: Farm Size ───── */
      case 2:
        return (
          <ScreenerStep
            title="How many total acres do you farm?"
            helper="Include all acres you own, rent, or manage"
          >
            <input
              type="number"
              min={0}
              value={formData.totalAcres}
              onChange={(e) =>
                updateField('totalAcres', e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Enter total acres"
              className={inputClass}
            />
          </ScreenerStep>
        );

      /* ───── Step 3: Primary Crops ───── */
      case 3:
        return (
          <ScreenerStep title="What do you grow?" helper="Select all that apply">
            <div className="space-y-3">
              {CROP_OPTIONS.map((crop) => {
                const checked = formData.crops.includes(crop.value);
                return (
                  <div key={crop.value}>
                    <label
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-300 hover:border-primary-light'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleArrayItem('crops', crop.value)}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="text-foreground">{crop.label}</span>
                    </label>
                    {checked && crop.value !== 'livestock' && crop.value !== 'idle' && (
                      <div className="mt-2 ml-8">
                        <label className="text-sm text-muted">
                          Acres of {crop.label}:
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formData.cropAcres[crop.value] || ''}
                          onChange={(e) =>
                            updateField('cropAcres', {
                              ...formData.cropAcres,
                              [crop.value]: e.target.value === '' ? 0 : Number(e.target.value),
                            })
                          }
                          placeholder="Acres"
                          className={`${inputClass} mt-1`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 4: Base Acres ───── */
      case 4:
        return (
          <ScreenerStep
            title="Do you have FSA base acres on your farm?"
            helper="Base acres are historical — they may not match what you plant today. Check your FSA records or ask your county office."
          >
            <div className="space-y-3">
              {[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'not_sure', label: "I'm not sure" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('hasBaseAcres', opt.value)}
                  className={`w-full p-4 border rounded-lg cursor-pointer text-center transition ${
                    formData.hasBaseAcres === opt.value
                      ? 'border-primary bg-primary/5 font-semibold'
                      : 'border-gray-300 hover:border-primary-light'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {formData.hasBaseAcres === 'yes' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Approximately how many base acres?
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.baseAcresAmount}
                    onChange={(e) =>
                      updateField(
                        'baseAcresAmount',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="Base acres"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 5: Current Programs ───── */
      case 5:
        return (
          <ScreenerStep
            title="Which USDA programs do you currently participate in?"
            helper="This helps us identify programs you might be missing"
          >
            <div className="space-y-3">
              {USDA_PROGRAM_OPTIONS.map((prog) => {
                const checked = formData.currentPrograms.includes(prog.value);
                return (
                  <label
                    key={prog.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary-light'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('currentPrograms', prog.value)}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-foreground">{prog.label}</span>
                  </label>
                );
              })}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 6: Conservation Practices ───── */
      case 6:
        return (
          <ScreenerStep
            title="Do you currently use any of these practices?"
            helper="These may qualify you for thousands in EQIP, CSP, or carbon credit programs"
          >
            <div className="space-y-3">
              {CONSERVATION_PRACTICES.map((practice) => {
                const checked = formData.conservationPractices.includes(practice.value);
                return (
                  <label
                    key={practice.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary-light'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('conservationPractices', practice.value)}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-foreground">{practice.label}</span>
                  </label>
                );
              })}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 7: Farmer Status ───── */
      case 7:
        return (
          <ScreenerStep
            title="Which of these apply to you?"
            helper="Beginning and veteran farmers receive significantly enhanced benefits — up to 90% cost-share and additional crop insurance subsidies"
          >
            <div className="space-y-3">
              {FARMER_STATUS_OPTIONS.map((status) => {
                const checked = formData.farmerStatus.includes(status.value);
                return (
                  <label
                    key={status.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary-light'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayItem('farmerStatus', status.value)}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-foreground">{status.label}</span>
                  </label>
                );
              })}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 8: Crop Insurance ───── */
      case 8:
        return (
          <ScreenerStep title="Do you currently have federal crop insurance?">
            <div className="space-y-3">
              {[
                { value: 'yes_rp', label: 'Yes — Revenue Protection (RP)' },
                { value: 'yes_other', label: 'Yes — other type' },
                { value: 'no', label: 'No crop insurance' },
                { value: 'not_sure', label: "I'm not sure" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('hasCropInsurance', opt.value)}
                  className={`w-full p-4 border rounded-lg cursor-pointer text-center transition ${
                    formData.hasCropInsurance === opt.value
                      ? 'border-primary bg-primary/5 font-semibold'
                      : 'border-gray-300 hover:border-primary-light'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {formData.hasCropInsurance.startsWith('yes') && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="coverageLevel"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      What coverage level?
                    </label>
                    <select
                      id="coverageLevel"
                      value={formData.coverageLevel}
                      onChange={(e) => updateField('coverageLevel', e.target.value)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select coverage level
                      </option>
                      {COVERAGE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}%
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Do you have SCO or ECO endorsements?
                    </p>
                    <div className="space-y-2">
                      {[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                        { value: 'not_sure', label: 'What are those?' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('hasScoEco', opt.value)}
                          className={`w-full p-3 border rounded-lg cursor-pointer text-center transition text-sm ${
                            formData.hasScoEco === opt.value
                              ? 'border-primary bg-primary/5 font-semibold'
                              : 'border-gray-300 hover:border-primary-light'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScreenerStep>
        );

      /* ───── Step 9: Financial Eligibility ───── */
      case 9:
        return (
          <ScreenerStep title="Financial eligibility">
            <div className="space-y-8">
              {/* AGI Question */}
              <div>
                <p className="font-medium text-foreground mb-1">
                  Is your average adjusted gross income (AGI) below $900,000 per year?
                </p>
                <p className="text-sm text-muted mb-3">
                  This is your average AGI over the past 3 tax years. Over 95% of farms qualify.
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                    { value: 'not_sure', label: "I'm not sure" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('agiUnder900k', opt.value)}
                      className={`w-full p-3 border rounded-lg cursor-pointer text-center transition text-sm ${
                        formData.agiUnder900k === opt.value
                          ? 'border-primary bg-primary/5 font-semibold'
                          : 'border-gray-300 hover:border-primary-light'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 75% Income Question */}
              <div>
                <p className="font-medium text-foreground mb-1">
                  Does 75% or more of your gross income come from farming?
                </p>
                <p className="text-sm text-muted mb-3">
                  If yes, you may be exempt from AGI limits for conservation and disaster programs.
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                    { value: 'not_sure', label: "I'm not sure" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('income75Farming', opt.value)}
                      className={`w-full p-3 border rounded-lg cursor-pointer text-center transition text-sm ${
                        formData.income75Farming === opt.value
                          ? 'border-primary bg-primary/5 font-semibold'
                          : 'border-gray-300 hover:border-primary-light'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScreenerStep>
        );

      /* ───── Step 10: Email ───── */
      case 10:
        return (
          <ScreenerStep title="Where should we send your personalized program report?">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="First name"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.wantsUpdates}
                  onChange={(e) => updateField('wantsUpdates', e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="text-foreground text-sm">
                  Send me deadline reminders and program updates
                </span>
              </label>
              <p className="text-sm text-muted">
                We&apos;ll never share your information. Unsubscribe anytime.
              </p>
            </div>
          </ScreenerStep>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-surface min-h-screen py-8 px-4">
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {renderStep()}

      {/* Navigation buttons */}
      <div className="flex justify-between max-w-2xl mx-auto mt-6">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="border border-gray-300 text-muted hover:bg-gray-50 rounded-lg px-6 py-3 transition"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="bg-primary text-white hover:bg-primary-light rounded-lg px-6 py-3 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isStepValid()}
            className="bg-accent text-primary font-bold rounded-lg px-6 py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            See My Results
          </button>
        )}
      </div>
    </div>
  );
}
