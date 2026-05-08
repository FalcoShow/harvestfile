-- ============================================================================
-- cleanup-test-farm.sql
-- ============================================================================
-- Purpose: Removes the Sell Score Test Farm and all linked grain_positions
--          rows. Use before re-running seed-test-farm.sql, or to clean dev DB.
--
-- Last run: NEVER (file created 2026-05-07; no test farm has been deleted yet)
--
-- Safety: All statements are commented out by default.
--         Uncomment ONE option (Option 1 or Option 2) to run.
--         Always SELECT first to confirm what will be deleted.
--
-- Verify before delete:
--   SELECT id, name, owner_id, county_fips, total_acres, created_at
--   FROM public.farms
--   WHERE name = 'Sell Score Test Farm';
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Option 1 — Delete ALL test farms by name + owner
-- ----------------------------------------------------------------------------
-- Use when you want to wipe every "Sell Score Test Farm" row owned by Andrew.
-- Both DELETEs must run together. Order matters (positions before farm, FK).
-- Uncomment both statements to run:

-- DELETE FROM public.grain_positions
-- WHERE farm_id IN (
--   SELECT id FROM public.farms
--   WHERE name = 'Sell Score Test Farm'
--     AND owner_id = '10a512f4-4a32-4843-b9cb-9da6df1c3d54'::uuid
-- );

-- DELETE FROM public.farms
-- WHERE name = 'Sell Score Test Farm'
--   AND owner_id = '10a512f4-4a32-4843-b9cb-9da6df1c3d54'::uuid;


-- ----------------------------------------------------------------------------
-- Option 2 — Delete a specific test farm by ID
-- ----------------------------------------------------------------------------
-- Use when you know the exact farm_id (from a prior seed result).
-- Replace <FARM_ID> with the actual uuid before uncommenting.

-- DELETE FROM public.grain_positions WHERE farm_id = '<FARM_ID>'::uuid;
-- DELETE FROM public.farms          WHERE id        = '<FARM_ID>'::uuid;


-- ----------------------------------------------------------------------------
-- Verify after delete (should return 0 rows)
-- ----------------------------------------------------------------------------
-- SELECT id, name FROM public.farms WHERE name = 'Sell Score Test Farm';