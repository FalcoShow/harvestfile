-- ============================================================================
-- add-grain-positions-updated-at.sql
-- ============================================================================
-- Purpose:  Hotfix R2.1 Item B hardening #3 — make every grain_positions
--           change timestamped. Never again a position change we can't
--           put a time on.
--
--           July 24, 2026 diagnostic finding: grain_positions.updated_at
--           EXISTS, but both Sell Score Test Farm rows still carry their
--           2026-05-07 INSERT timestamp after multiple UPDATEs (log-sale
--           increments, pace rewrites). The column has a DEFAULT but no
--           BEFORE UPDATE trigger, so it never moves after insert — which
--           is exactly why the corn 25,000→27,200 change could not be
--           timestamped during the Item B investigation.
--
--           Adds, idempotently:
--             1. updated_at column IF ABSENT (defensive; prod has it)
--             2. set_grain_positions_updated_at() trigger function
--             3. BEFORE UPDATE trigger on public.grain_positions
--
-- Last run: NOT YET RUN — run via the Supabase SQL editor for project
--           fzduyjxjdcxbdwjlwrpu. Run BEFORE
--           correct-corn-position-2026-07-24.sql so the correction itself
--           gets a timestamp.
--
-- Idempotent: YES (IF NOT EXISTS / OR REPLACE / DROP TRIGGER IF EXISTS).
--
-- Verify after running:
--   1. Trigger exists:
--        SELECT tgname FROM pg_trigger
--        WHERE tgrelid = 'public.grain_positions'::regclass
--          AND NOT tgisinternal;
--        -- expect: grain_positions_set_updated_at
--   2. It fires — no-op update one test row, then re-select:
--        UPDATE public.grain_positions
--        SET pricing_pace_pct = pricing_pace_pct
--        WHERE farm_id = 'cf458f1e-8c11-4628-8918-5b3df94ccfbc'
--          AND commodity = 'soybeans';
--        SELECT commodity, updated_at FROM public.grain_positions
--        WHERE farm_id = 'cf458f1e-8c11-4628-8918-5b3df94ccfbc';
--        -- soybeans updated_at is now current; corn is unchanged.
-- ============================================================================

ALTER TABLE public.grain_positions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_grain_positions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grain_positions_set_updated_at
  ON public.grain_positions;

CREATE TRIGGER grain_positions_set_updated_at
  BEFORE UPDATE ON public.grain_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_grain_positions_updated_at();
