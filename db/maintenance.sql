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
-- 2026-07-23 — sellscore_sales_log table + RLS (Round 2 Item 2, spec §6.1)
-- ----------------------------------------------------------------------------
-- Context: The locked v1 spec §6.1 sales-log table was never created;
--          "Log a sale" wrote a position decrement only. Round 2 adds the
--          table, the best-effort insert in /api/sellscore/log-sale, and the
--          read-only history section on /sellscore/me. FK targets the live
--          public.farms table (spec's sellscore_farms superseded). RLS is the
--          SHORT owner_id chain, SELECT + INSERT only. No CHECK constraints
--          (spec defines none; introspect with pg_get_constraintdef before
--          ever adding any — see 2026-05-07 entry above).
--
-- Run by:  PENDING — run create-sellscore-sales-log.sql via the Supabase SQL
--          editor before (or with) the Round 2 deploy. Until it runs, the
--          app degrades gracefully (best-effort insert logs a console error;
--          /sellscore/me history renders its empty state).
-- Idempotent: YES (IF NOT EXISTS guards + DO blocks for policies)
--
-- See: create-sellscore-sales-log.sql for the full statement and verify steps.


-- ----------------------------------------------------------------------------
-- 2026-07-24 — grain_positions updated_at trigger (Hotfix R2.1 Item B #3)
-- ----------------------------------------------------------------------------
-- Context: Item B diagnostics showed updated_at EXISTS on grain_positions
--          but never moves on UPDATE (both test-farm rows still carried
--          their 2026-05-07 insert timestamp after multiple log-sale
--          writes) — no BEFORE UPDATE trigger. That made the corn
--          25,000→27,200 change untimestampable. Adds the trigger
--          (+ column defensively).
--
-- Run by:  PENDING — run add-grain-positions-updated-at.sql via the
--          Supabase SQL editor BEFORE the corn correction below, so the
--          correction itself gets a timestamp.
-- Idempotent: YES (IF NOT EXISTS / OR REPLACE / DROP TRIGGER IF EXISTS)
--
-- See: add-grain-positions-updated-at.sql for the full statement + verify.


-- ----------------------------------------------------------------------------
-- 2026-07-24 — Corn position correction, Sell Score Test Farm (Hotfix R2.1)
-- ----------------------------------------------------------------------------
-- Context: Corn bushels_contracted moved 25,000→27,200 with no sales_log
--          row. Root cause: a 2,200 bu corn sale POSTed to
--          /api/sellscore/log-sale during the July 23 evidence gap — the
--          A1 deploy (20:52 ET) wrote positions with no sales_log insert
--          in the code, and the table was created in prod later still.
--          Arithmetic matches the route exactly (25,000+2,200=27,200;
--          pace 54 = round(27,200/50,000×100)). Sales history contains
--          only the soybean 2,500 bu sale, so corn is restored to 25,000
--          to keep position and books consistent. Write paths are now
--          loudly logged (POSITION_WRITE / EVENT_INSERT_FAILED) and
--          duplicate-guarded — this class of silent change is closed.
--
-- Run by:  PENDING — run correct-corn-position-2026-07-24.sql via the
--          Supabase SQL editor AFTER the trigger entry above, then
--          recompute (Inngest sellscore-compute manual run, or
--          POST /api/sellscore/compute) and verify /sellscore/me shows
--          corn 50% priced.
-- Idempotent: YES (guarded on bushels_contracted = 27200; re-run = 0 rows)
--
-- See: correct-corn-position-2026-07-24.sql for the full statement + verify.


-- ----------------------------------------------------------------------------
-- (next entries appended below)
-- ----------------------------------------------------------------------------
