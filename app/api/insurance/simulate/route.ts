// =============================================================================
// HarvestFile — Phase 20 Build 3: Monte Carlo Simulation API
// app/api/insurance/simulate/route.ts
//
// Server-side endpoint that runs the Monte Carlo simulation engine.
// Returns probability distributions for all 4 strategy combinations.
//
// Performance target: <200ms for 10,000 iterations.
// Caching: Results are deterministic for the same seed, so we can
// cache aggressively with s-maxage.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runMonteCarloSimulation, type SimulationInputs } from '@/lib/insurance/monte-carlo';

// Force Node.js runtime for performance (not Edge — typed arrays are faster)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Input Validation ───────────────────────────────────────────────────────

const simulationSchema = z.object({
  commodity: z.enum(['CORN', 'SOYBEANS', 'WHEAT']),
  aphYield: z.coerce.number().positive().max(999),
  plantedAcres: z.coerce.number().positive().max(100000),
  baseAcres: z.coerce.number().positive().max(100000),
  coverageLevel: z.coerce.number().refine(
    (v): v is 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 =>
      [50, 55, 60, 65, 70, 75, 80, 85].includes(v),
    'Must be 50, 55, 60, 65, 70, 75, 80, or 85'
  ),
  plcYield: z.coerce.number().positive().max(999).optional(),
  countyYield: z.coerce.number().positive().max(999).optional(),
  farmCountyCorrelation: z.coerce.number().min(0).max(1).optional(),
  numIterations: z.coerce.number().int().min(1000).max(50000).optional(),
  seed: z.coerce.number().int().optional(),
  
  // Real ADM premium data (farmer-paid $/acre)
  rpFarmerPremiumPerAcre: z.coerce.number().min(0).optional(),
  scoFarmerPremiumPerAcre: z.coerce.number().min(0).optional(),
  eco95FarmerPremiumPerAcre: z.coerce.number().min(0).optional(),
  eco90FarmerPremiumPerAcre: z.coerce.number().min(0).optional(),
});

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = simulationSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({
        success: false,
        error: `Validation failed: ${JSON.stringify(errors)}`,
        data: null,
      }, { status: 400 });
    }

    const inputs: SimulationInputs = {
      ...parsed.data,
      coverageLevel: parsed.data.coverageLevel as SimulationInputs['coverageLevel'],
    };

    // Run the simulation
    const result = runMonteCarloSimulation(inputs);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        iterations: result.iterations,
        executionTimeMs: result.executionTimeMs,
        bestScenario: result.bestScenario,
        bestNetBenefitPerAcre: result.bestExpectedNetBenefitPerAcre,
        calculatedAt: new Date().toISOString(),
      },
    }, {
      status: 200,
      headers: {
        // Cache for 1 hour — same inputs produce same results (deterministic with seed)
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Simulation failed: ${err instanceof Error ? err.message : String(err)}`,
      data: null,
    }, { status: 500 });
  }
}

// ─── GET handler (convenience for testing) ──────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = simulationSchema.safeParse(rawParams);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({
        success: false,
        error: `Validation failed: ${JSON.stringify(errors)}`,
        data: null,
      }, { status: 400 });
    }

    const inputs: SimulationInputs = {
      ...parsed.data,
      coverageLevel: parsed.data.coverageLevel as SimulationInputs['coverageLevel'],
    };

    const result = runMonteCarloSimulation(inputs);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        iterations: result.iterations,
        executionTimeMs: result.executionTimeMs,
        bestScenario: result.bestScenario,
        bestNetBenefitPerAcre: result.bestExpectedNetBenefitPerAcre,
        calculatedAt: new Date().toISOString(),
      },
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Simulation failed: ${err instanceof Error ? err.message : String(err)}`,
      data: null,
    }, { status: 500 });
  }
}
