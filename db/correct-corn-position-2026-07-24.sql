-- ============================================================================
-- correct-corn-position-2026-07-24.sql
-- ============================================================================
-- Purpose:  Hotfix R2.1 Item B data correction. Restores the Sell Score
--           Test Farm corn position after the July 23 evidence-gap write.
--
-- What happened (root cause, from git timeline + July 24 diagnostics):
--   A corn sale of 2,200 bu was POSTed to /api/sellscore/log-sale during
--   the evidence gap: the A1 deploy (July 23, 20:52 ET) shipped the
--   position write with NO sellscore_sales_log insert in the code, and
--   the table itself was created in prod later still (R2 Item 2 code
--   landed 23:48; table SQL ran after that). The arithmetic matches the
--   log-sale route exactly: 25,000 + 2,200 = 27,200, and stored pace
--   54 = round(27,200 / 50,000 × 100) — the route's own formula. No
--   bookkeeping row exists by construction, and updated_at never moved
--   because grain_positions had no update trigger (fixed by
--   add-grain-positions-updated-at.sql).
--
--   The books (sellscore_sales_log) contain only the soybean 2,500 bu
--   test sale, so corn is restored to its pre-gap seed value to keep the
--   position consistent with the sales history. Every write path is now
--   loudly logged (POSITION_WRITE / EVENT_INSERT_FAILED), so any future
--   change carries evidence.
--
-- Guard: the UPDATE fires only while corn still shows the spurious
--        27,200 — safe to re-run; a second run updates 0 rows.
--
-- Run order: run add-grain-positions-updated-at.sql FIRST so this
--            correction itself gets a timestamp.
--
-- After running, recompute so today's recommendation reflects the
-- corrected position: manual run of the Inngest sellscore-compute cron,
-- or (logged in as the farm owner) POST /api/sellscore/compute with
-- {"farmId":"cf458f1e-8c11-4628-8918-5b3df94ccfbc"}. Then verify
-- /sellscore/me shows corn 50% priced (25,000 of 50,000).
--
-- Last run: NOT YET RUN — run via the Supabase SQL editor for project
--           fzduyjxjdcxbdwjlwrpu.
-- ============================================================================

UPDATE public.grain_positions
SET bushels_contracted = 25000,
    pricing_pace_pct   = 50
WHERE id = '278f93cc-01e0-45b2-b195-9feed9ccce19'  -- corn position (seed ID)
  AND farm_id = 'cf458f1e-8c11-4628-8918-5b3df94ccfbc'
  AND commodity = 'corn'
  AND bushels_contracted = 27200;                  -- guard: spurious value only

-- Verify:
--   SELECT commodity, expected_bushels, bushels_contracted,
--          pricing_pace_pct, updated_at
--   FROM public.grain_positions
--   WHERE farm_id = 'cf458f1e-8c11-4628-8918-5b3df94ccfbc';
--   -- corn: 27,200 -> 25,000, pace 54 -> 50; updated_at current if the
--   -- trigger migration ran first. Soybeans untouched (9,250 / 62 — that
--   -- position matches its sales_log row and stays).
