// =============================================================================
// HarvestFile — Phase 22: Monte Carlo Distribution Utilities
// lib/optimizer/distributions.ts
//
// Statistical sampling functions for the OBBBA Election Optimizer.
// Uses Box-Muller transform for normal deviates and Cholesky decomposition
// for correlated price-yield pairs.
//
// No external dependencies — pure TypeScript math.
// =============================================================================

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────
// Deterministic RNG so results are reproducible for the same inputs.

export function createRNG(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Box-Muller Transform ────────────────────────────────────────────────────
// Generates pairs of independent standard normal random variables.

export function boxMuller(rng: () => number): [number, number] {
  let u1: number, u2: number;
  do { u1 = rng(); } while (u1 === 0); // Avoid log(0)
  u2 = rng();
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  const z0 = mag * Math.cos(2.0 * Math.PI * u2);
  const z1 = mag * Math.sin(2.0 * Math.PI * u2);
  return [z0, z1];
}

// ─── Normal Distribution Sampling ────────────────────────────────────────────

export function sampleNormal(
  mean: number,
  stdDev: number,
  rng: () => number,
): number {
  const [z] = boxMuller(rng);
  return mean + stdDev * z;
}

// ─── Log-Normal Distribution Sampling ────────────────────────────────────────
// If X ~ LogNormal(μ, σ), then ln(X) ~ Normal(μ, σ).
// Given desired mean M and std dev S of the log-normal:
//   σ² = ln(1 + (S/M)²)
//   μ  = ln(M) - σ²/2

export function logNormalParams(
  desiredMean: number,
  desiredStdDev: number,
): { mu: number; sigma: number } {
  if (desiredMean <= 0) return { mu: 0, sigma: 0 };
  const cv = desiredStdDev / desiredMean;
  const sigma2 = Math.log(1 + cv * cv);
  const sigma = Math.sqrt(sigma2);
  const mu = Math.log(desiredMean) - sigma2 / 2;
  return { mu, sigma };
}

export function sampleLogNormal(
  mu: number,
  sigma: number,
  rng: () => number,
): number {
  const [z] = boxMuller(rng);
  return Math.exp(mu + sigma * z);
}

// ─── Correlated Normal Pairs (Cholesky 2×2) ─────────────────────────────────
// Given independent Z1, Z2 ~ N(0,1) and correlation ρ:
//   X1 = Z1
//   X2 = ρ·Z1 + √(1-ρ²)·Z2
// Then Corr(X1, X2) = ρ.
//
// For ARC/PLC: price and yield are negatively correlated (~-0.3 to -0.5).
// Low yields → supply shortage → higher prices.

export function sampleCorrelatedPair(
  rng: () => number,
  correlation: number,
): [number, number] {
  const [z1, z2] = boxMuller(rng);
  const x1 = z1;
  const rhoClamp = Math.max(-0.99, Math.min(0.99, correlation));
  const x2 = rhoClamp * z1 + Math.sqrt(1 - rhoClamp * rhoClamp) * z2;
  return [x1, x2];
}

// ─── Historical Volatility Calculation ───────────────────────────────────────
// Coefficient of variation from a time series.

export function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0.15; // Default 15% CV
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0.15;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

// ─── Detrended Yield Variability ─────────────────────────────────────────────
// Remove linear trend before computing CV to isolate weather/random variability.

export function detrendedYieldCV(
  yields: { year: number; value: number }[],
): number {
  if (yields.length < 4) return 0.10; // Default 10% yield CV

  // Linear regression
  const n = yields.length;
  const sumX = yields.reduce((s, d) => s + d.year, 0);
  const sumY = yields.reduce((s, d) => s + d.value, 0);
  const sumXY = yields.reduce((s, d) => s + d.year * d.value, 0);
  const sumX2 = yields.reduce((s, d) => s + d.year * d.year, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (denom === 0) return 0.10;

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;

  // Compute residuals
  const residuals = yields.map((d) => d.value - (m * d.year + b));
  const meanY = sumY / n;
  if (meanY === 0) return 0.10;

  const residualVariance =
    residuals.reduce((s, r) => s + r * r, 0) / (n - 2);
  const cv = Math.sqrt(residualVariance) / meanY;

  // Clamp to reasonable range (3%–30%)
  return Math.max(0.03, Math.min(0.30, cv));
}

// ─── Percentile Calculation ──────────────────────────────────────────────────

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  const frac = idx - lower;
  return sortedValues[lower] * (1 - frac) + sortedValues[upper] * frac;
}
