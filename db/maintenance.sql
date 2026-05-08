-- ============================================================================
-- maintenance.sql
-- ============================================================================
-- Purpose: Append-only log of one-off database operations performed outside
--          the main schema migration flow. Each entry dated and described.
--
-- Rules:   NEVER delete entries — only add new ones, or mark superseded
--          with a comment noting when and why.
--          Each entry includes: date, context, the SQL itself, and verify steps.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 2026-05-07 — Defensive UNIQUE constraint on county_basis_history
-- ----------------------------------------------------------------------------
-- Context: Added during Task 3.2 (basis history backfill). Discovered after
--          the fact that county_basis_history_pkey already enforced uniqueness
--          on the same (county_fips, crop, observation_date) tuple, making
--          this UNIQUE constraint REDUNDANT but harmless. Kept in the schema
--          for now; can be dropped during a future cleanup pass.
--
-- Run by: Andrew, via Supabase SQL editor
-- Idempotent: YES (DO block guards against duplicate creation)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'county_basis_history_unique_observation'
  ) THEN
    ALTER TABLE public.county_basis_history
    ADD CONSTRAINT county_basis_history_unique_observation
    UNIQUE (county_fips, crop, observation_date);
  END IF;
END $$;

-- Verify:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.county_basis_history'::regclass;


-- ----------------------------------------------------------------------------
-- 2026-05-07 — Seeded Sell Score Test Farm (Task 5.3)
-- ----------------------------------------------------------------------------
-- Context: First test farm for Sell Score data-fetcher e2e testing.
--          Initial attempt failed on grain_positions_breakeven_source_check
--          (used 'farmer_entered'; allowed values are 'county_default' and
--          'user_provided'). Corrected and re-run successfully.
--
-- Resulting IDs:
--   Farm:          cf458f1e-8c11-4628-8918-5b3df94ccfbc
--   Corn position: 278f93cc-01e0-45b2-b195-9feed9ccce19
--   Soy position:  2735f36c-a68d-4a55-a3f8-7c8a5541688f
--
-- See: seed-test-farm.sql for the full statement.


-- ----------------------------------------------------------------------------
-- (next entries appended below)
-- ----------------------------------------------------------------------------