import type { ScreenerData } from '@/lib/eligibility-engine';
import { CRP_RENTAL_RATES, CRP_RENTAL_RATES_DEFAULT } from '@/lib/constants';

export function calculateArcPlcValue(data: ScreenerData): { min: number; max: number } {
  if (data.hasBaseAcres === 'no') {
    return { min: 0, max: 0 };
  }

  const baseAcres = data.baseAcresAmount || data.totalAcres * 0.85;
  const payableAcres = baseAcres * 0.85;

  const hasCorn = data.crops.includes('corn');
  const hasSoybeans = data.crops.includes('soybeans');

  const cornRatio =
    data.cropAcres.corn && data.totalAcres > 0
      ? data.cropAcres.corn / data.totalAcres
      : hasCorn
        ? 0.5
        : 0;

  const soyRatio =
    data.cropAcres.soybeans && data.totalAcres > 0
      ? data.cropAcres.soybeans / data.totalAcres
      : hasSoybeans
        ? 0.5
        : 0;

  const cornValue = hasCorn ? payableAcres * 66 * cornRatio : 0;
  const soyValue = hasSoybeans ? payableAcres * 22 * soyRatio : 0;

  const total = Math.min(cornValue + soyValue, 164000);

  if (total === 0 && (data.hasBaseAcres === 'yes' || data.hasBaseAcres === 'not_sure')) {
    return { min: 3000, max: 20000 };
  }

  return { min: Math.round(total * 0.5), max: Math.round(total) };
}

export function calculateEqipValue(data: ScreenerData): { min: number; max: number } {
  const isBeginning = data.farmerStatus.includes('beginning');

  let min = isBeginning ? 15000 : 7800;
  let max = isBeginning ? 30000 : 30000;

  if (data.totalAcres > 500) {
    max += 5000;
  } else if (data.totalAcres < 100) {
    max = Math.min(max, 20000);
  }

  return { min, max };
}

export function calculateCrpValue(data: ScreenerData): { min: number; max: number } {
  const stateRates = CRP_RENTAL_RATES[data.state] || CRP_RENTAL_RATES_DEFAULT;
  const rentalRate = stateRates.general;

  const estimatedAcres = data.totalAcres * 0.15;
  const value = estimatedAcres * rentalRate;

  return {
    min: Math.round(value * 0.5),
    max: Math.min(Math.round(value), 50000),
  };
}

export function calculateCspValue(data: ScreenerData): { min: number; max: number } {
  const practiceCount = data.conservationPractices.filter((p) => p !== 'none').length;

  if (practiceCount < 2) {
    return { min: 0, max: 0 };
  }

  const baseValue = data.totalAcres * 12;

  return {
    min: Math.round(Math.max(4000, baseValue * 0.5)),
    max: Math.round(Math.min(50000, baseValue * 1.5)),
  };
}

export function calculateFarmerBridgeValue(data: ScreenerData): { min: number; max: number } {
  const cornAcres = data.cropAcres.corn || 0;
  const soyAcres = data.cropAcres.soybeans || 0;
  const wheatAcres = data.cropAcres.wheat || 0;

  const total = cornAcres * 44.36 + soyAcres * 30.88 + wheatAcres * 39.35;
  const capped = Math.min(total, 155000);

  return {
    min: Math.round(total * 0.9),
    max: Math.round(capped),
  };
}

export function calculateCropInsuranceSavings(data: ScreenerData): { min: number; max: number } {
  const hasCropInsurance = data.hasCropInsurance.startsWith('yes');
  const coverageNum = parseInt(data.coverageLevel, 10) || 0;
  const hasScoEco = data.hasScoEco === 'yes';

  // Already has insurance at 80%+ with SCO/ECO
  if (hasCropInsurance && coverageNum >= 80 && hasScoEco) {
    return { min: 500, max: 2000 };
  }

  // No crop insurance at all
  if (!hasCropInsurance) {
    const estimatedPremium = data.totalAcres * 35;
    const obbbaDiscount = estimatedPremium * 0.04;
    return {
      min: Math.round(obbbaDiscount * 0.5),
      max: Math.round(obbbaDiscount * 1.5),
    };
  }

  // Has insurance but no SCO/ECO
  if (!hasScoEco || data.hasScoEco === 'no') {
    return { min: 1000, max: 5000 };
  }

  // Coverage below 80%
  if (coverageNum < 80) {
    return { min: 2000, max: 8000 };
  }

  return { min: 1000, max: 5000 };
}

export function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
