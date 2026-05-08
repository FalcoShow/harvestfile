-- ============================================================================
-- seed-test-farm.sql
-- ============================================================================
-- Purpose: Seeds the canonical "Sell Score Test Farm" used by data-fetcher.ts
--          e2e tests and engine integration verification.
--
-- Last successful run: 2026-05-07
--
-- Owner: andrewangerstien32@gmail.com (HarvestFile org primary account)
--        auth_user_id 10a512f4-4a32-4843-b9cb-9da6df1c3d54
--
-- Resulting IDs (from 2026-05-07 run):
--   Farm:          cf458f1e-8c11-4628-8918-5b3df94ccfbc
--   Corn position: 278f93cc-01e0-45b2-b195-9feed9ccce19
--   Soy position:  2735f36c-a68d-4a55-a3f8-7c8a5541688f
--
-- Farm shape:
--   - 500 acres at IA/Clinton (FIPS 19045)
--   - Reference elevator: River Valley DeWitt (Barchart locationId 55552)
--   - Corn:     50,000 bu expected, $4.00 BE, 25,000 sold (50%)
--   - Soybeans: 15,000 bu expected, $10.50 BE, 6,750 sold (45%)
--
-- Idempotency: NOT idempotent. Running twice creates two farms.
--              Run cleanup-test-farm.sql first if re-seeding.
--
-- Verify after run:
--   SELECT f.id, f.name, gp.commodity, gp.expected_bushels, gp.bushels_contracted
--   FROM public.farms f
--   LEFT JOIN public.grain_positions gp ON gp.farm_id = f.id
--   WHERE f.name = 'Sell Score Test Farm';
-- ============================================================================

WITH new_farm AS (
  INSERT INTO public.farms (
    name,
    owner_id,
    county_fips,
    state,
    total_acres,
    sellscore_setup_complete,
    sellscore_active,
    sellscore_primary_crops,
    sellscore_setup_completed_at
  )
  VALUES (
    'Sell Score Test Farm',
    '10a512f4-4a32-4843-b9cb-9da6df1c3d54'::uuid,
    '19045',
    'IA',
    500,
    true,
    true,
    ARRAY['corn', 'soybeans'],
    now()
  )
  RETURNING id, name
),
corn_position AS (
  INSERT INTO public.grain_positions (
    farm_id,
    commodity,
    crop_year,
    expected_bushels,
    breakeven_dollars_per_bu,
    breakeven_source,
    bushels_contracted
  )
  SELECT id, 'corn', 2025, 50000, 4.00, 'user_provided', 25000
  FROM new_farm
  RETURNING id, commodity
),
soy_position AS (
  INSERT INTO public.grain_positions (
    farm_id,
    commodity,
    crop_year,
    expected_bushels,
    breakeven_dollars_per_bu,
    breakeven_source,
    bushels_contracted
  )
  SELECT id, 'soybeans', 2025, 15000, 10.50, 'user_provided', 6750
  FROM new_farm
  RETURNING id, commodity
)
SELECT
  (SELECT id FROM new_farm) AS farm_id,
  (SELECT name FROM new_farm) AS farm_name,
  (SELECT id FROM corn_position) AS corn_position_id,
  (SELECT id FROM soy_position) AS soy_position_id;