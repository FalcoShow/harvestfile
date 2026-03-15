-- =============================================================================
-- HarvestFile — Peanut Unit Mismatch Fix
-- Phase 6A: Fix ARC/PLC calculations for PEANUTS
--
-- PROBLEM: Peanut yields from NASS are in lbs/acre, but MYA prices are $/ton.
-- The benchmark calculation was multiplying them directly, producing $241K/acre
-- numbers that are obviously wrong.
--
-- FIX: Divide peanut yields by 2000 before multiplying by price ($/ton).
-- Revenue = (yield_lbs / 2000) × price_per_ton
--
-- OBBBA Peanut Parameters:
--   Statutory Reference Price: $630.00/ton
--   Loan Rate: $355.00/ton
--   ARC Guarantee: 90% of benchmark revenue
--   ARC Payment Cap: 12% of benchmark revenue
--   Payment on 88% of base acres
-- =============================================================================

-- Step 1: Recalculate benchmark_revenue for peanuts
-- benchmark_revenue = (benchmark_yield / 2000) × benchmark_price
UPDATE county_crop_data
SET benchmark_revenue = ROUND((benchmark_yield / 2000.0) * benchmark_price, 2)
WHERE commodity_code = 'PEANUTS'
  AND benchmark_yield IS NOT NULL
  AND benchmark_price IS NOT NULL;

-- Step 2: Recalculate arc_guarantee (90% under OBBBA)
UPDATE county_crop_data
SET arc_guarantee = ROUND(0.90 * benchmark_revenue, 2)
WHERE commodity_code = 'PEANUTS'
  AND benchmark_revenue IS NOT NULL;

-- Step 3: Recalculate arc_actual_revenue
-- actual_revenue = (county_yield / 2000) × max(mya_price, loan_rate)
-- Peanut loan rate = $355/ton
UPDATE county_crop_data
SET arc_actual_revenue = ROUND(
  (county_yield / 2000.0) * GREATEST(COALESCE(mya_price, 0), 355.0),
  2
)
WHERE commodity_code = 'PEANUTS'
  AND county_yield IS NOT NULL;

-- Step 4: Recalculate arc_payment_rate
-- payment = min(max(0, guarantee - actual), 0.12 × benchmark_revenue)
UPDATE county_crop_data
SET arc_payment_rate = ROUND(
  LEAST(
    GREATEST(0, COALESCE(arc_guarantee, 0) - COALESCE(arc_actual_revenue, 0)),
    0.12 * COALESCE(benchmark_revenue, 0)
  ),
  2
)
WHERE commodity_code = 'PEANUTS'
  AND arc_guarantee IS NOT NULL;

-- Step 5: Recalculate PLC payment rate for peanuts
-- plc_payment_rate = max(0, effective_ref_price - max(mya_price, loan_rate))
-- Note: PLC uses PLC yield (in tons already? Need to verify)
-- The PLC yield for peanuts should also be in tons/acre
-- effective_ref_price for peanuts under OBBBA = $630/ton
-- But effective_ref_price = max(statutory, min(1.15 × statutory, 0.88 × olympic_avg_mya))
-- For now, use $630/ton as the floor
UPDATE county_crop_data
SET plc_payment_rate = ROUND(
  GREATEST(0, 630.0 - GREATEST(COALESCE(mya_price, 0), 355.0)),
  2
)
WHERE commodity_code = 'PEANUTS'
  AND mya_price IS NOT NULL;

-- Verify: Check a sample of peanut records to confirm reasonable values
-- Typical peanut yield: 3,000-5,000 lbs/acre = 1.5-2.5 tons/acre
-- Typical MYA price: $400-700/ton
-- Expected revenue range: ~$600-$1,750/acre
-- Expected ARC payment: $0-$100/acre (NOT $241,000!)
SELECT
  county_fips,
  crop_year,
  county_yield AS yield_lbs_per_acre,
  ROUND(county_yield / 2000.0, 2) AS yield_tons_per_acre,
  mya_price AS price_per_ton,
  benchmark_revenue,
  arc_guarantee,
  arc_actual_revenue,
  arc_payment_rate,
  plc_payment_rate
FROM county_crop_data
WHERE commodity_code = 'PEANUTS'
  AND county_yield IS NOT NULL
  AND benchmark_revenue IS NOT NULL
ORDER BY crop_year DESC, county_fips
LIMIT 20;
