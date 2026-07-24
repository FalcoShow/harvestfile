-- ============================================================================
-- create-sellscore-sales-log.sql
-- ============================================================================
-- Purpose:  Creates public.sellscore_sales_log — the per-sale bookkeeping
--           table from the locked Sell Score v1 spec §6.1. Until this table
--           existed, "Log a sale" wrote a position decrement only; farmers
--           had no way to see what they logged. History accrues from the
--           moment this runs — no backfill exists or is possible (no
--           historical sale events were ever stored).
--
-- Spec adjustments (per Round 2 handoff, July 23, 2026):
--   - farm_id references the live public.farms table (the spec's
--     sellscore_farms was superseded by the farms.owner_id architecture).
--   - RLS uses the SHORT owner chain per architecture rules:
--     farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
--     SELECT + INSERT only. No UPDATE/DELETE policies — v1 history is
--     read-only for users; the log-sale API writes via service role.
--   - No CHECK constraints added: spec §6.1 defines none, and per codified
--     learning (see maintenance.sql 2026-05-07 entry) any future CHECK must
--     first introspect existing definitions:
--       SELECT conname, pg_get_constraintdef(oid)
--       FROM pg_constraint
--       WHERE conrelid = 'public.sellscore_sales_log'::regclass;
--
-- Last run: NOT YET RUN — run via the Supabase SQL editor for project
--           fzduyjxjdcxbdwjlwrpu before (or with) the Round 2 deploy.
--           The app degrades gracefully until then: the log-sale insert is
--           best-effort and the /sellscore/me history section renders its
--           empty state if the table is missing.
--
-- Idempotent: YES (IF NOT EXISTS guards + DO blocks for policies).
--
-- Verify after running:
--   1. SELECT * FROM public.sellscore_sales_log LIMIT 1;   -- table exists, 0 rows
--   2. SELECT relrowsecurity FROM pg_class
--      WHERE oid = 'public.sellscore_sales_log'::regclass;  -- expect true
--   3. SELECT polname, polcmd FROM pg_policy
--      WHERE polrelid = 'public.sellscore_sales_log'::regclass;
--      -- expect sellscore_sales_log_select_own (r),
--      --        sellscore_sales_log_insert_own (a)
--   4. Log a sale from /sellscore/me and confirm one row appears with
--      crop/bushels/sale_date populated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sellscore_sales_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  crop text NOT NULL,
  bushels_sold int NOT NULL,
  cash_bid_at_sale numeric(6,3),
  elevator_id text,
  recommendation_id uuid REFERENCES public.sellscore_recommendations(id),
  followed_recommendation bool,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Supports the /sellscore/me history query:
-- WHERE farm_id = ? AND sale_date >= <marketing-year start> ORDER BY sale_date DESC
CREATE INDEX IF NOT EXISTS sellscore_sales_log_farm_sale_date_idx
  ON public.sellscore_sales_log (farm_id, sale_date DESC);

ALTER TABLE public.sellscore_sales_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'sellscore_sales_log_select_own'
      AND polrelid = 'public.sellscore_sales_log'::regclass
  ) THEN
    CREATE POLICY sellscore_sales_log_select_own
      ON public.sellscore_sales_log
      FOR SELECT
      USING (
        farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'sellscore_sales_log_insert_own'
      AND polrelid = 'public.sellscore_sales_log'::regclass
  ) THEN
    CREATE POLICY sellscore_sales_log_insert_own
      ON public.sellscore_sales_log
      FOR INSERT
      WITH CHECK (
        farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
      );
  END IF;
END $$;
