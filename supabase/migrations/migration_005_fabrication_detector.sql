-- ============================================================================
-- Migration 005 — Safeguard 3 Fabrication Detector (Priority 5)
-- Date: 2026-04-22
-- Author: HarvestFile Session 8 Priority 5 build
--
-- Purpose:
--   1. Add fabrication detection columns to outreach_leads
--   2. Create pending_fabrication_check_leads view (NEW polling source for P5)
--   3. Update pending_push_leads view to gate behind fabrication clearance
--
-- Idempotent: every CREATE / ADD uses IF NOT EXISTS or DROP IF EXISTS first.
-- Safe to run multiple times. Safe to run on production with existing data.
--
-- Backwards-compatibility: pending_push_leads view treats fabrication_severity
-- IS NULL as eligible (so the 16 grandfathered production leads are NOT blocked
-- when this migration applies). New leads going forward will have NULL until
-- Safeguard 3 processes them, at which point severity becomes NONE/MINOR/MAJOR.
-- The Fabrication Detector workflow polls leads with NULL severity and
-- processes them within 10 minutes. There is no production lead-stranding risk.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Phase 1: Add Priority 5 columns to outreach_leads
-- ----------------------------------------------------------------------------

ALTER TABLE public.outreach_leads
  ADD COLUMN IF NOT EXISTS fabrication_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fabrication_severity text
    CHECK (fabrication_severity IN ('NONE', 'MINOR', 'MAJOR') OR fabrication_severity IS NULL),
  ADD COLUMN IF NOT EXISTS suggested_rewrite text,
  ADD COLUMN IF NOT EXISTS fabrication_retry_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fabrication_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS fabrication_method text
    CHECK (fabrication_method IN ('HAIKU_FACT_CHECK', 'MANUAL_OVERRIDE', 'NONE') OR fabrication_method IS NULL);

COMMENT ON COLUMN public.outreach_leads.fabrication_flags IS
  'Array of {claim_text, appears_in_source, source, supporting_quote} from Haiku fact-check';

COMMENT ON COLUMN public.outreach_leads.fabrication_severity IS
  'NONE = every claim sourced; MINOR = 1 soft generalization; MAJOR = specific fabrication';

COMMENT ON COLUMN public.outreach_leads.suggested_rewrite IS
  'Haiku-generated rewrite of the personalization_hook with fabricated claims removed';

COMMENT ON COLUMN public.outreach_leads.fabrication_retry_count IS
  'Number of times Safeguard 3 has retried this lead; max 3 before escalation';

COMMENT ON COLUMN public.outreach_leads.fabrication_checked_at IS
  'Timestamp of most recent Safeguard 3 evaluation';

COMMENT ON COLUMN public.outreach_leads.fabrication_method IS
  'HAIKU_FACT_CHECK = automated; MANUAL_OVERRIDE = Andrew approved a MAJOR; NONE = pre-P5 grandfathered';

-- Index for efficient view polling
CREATE INDEX IF NOT EXISTS idx_outreach_leads_fabrication_pending
  ON public.outreach_leads (enrichment_status, fabrication_severity, instantly_synced_at)
  WHERE enrichment_status = 'enriched'
    AND fabrication_severity IS NULL
    AND instantly_synced_at IS NULL;

-- ----------------------------------------------------------------------------
-- Phase 2: NEW view — pending_fabrication_check_leads
--   Polled by Safeguard 3 workflow every 10 minutes
--   Selects enriched leads that have not yet been fabrication-checked
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.pending_fabrication_check_leads;

CREATE VIEW public.pending_fabrication_check_leads
WITH (security_invoker = true) AS
SELECT
  id,
  email,
  first_name,
  last_name,
  job_title,
  company_name,
  company_name_normalized,
  company_website,
  city,
  state,
  personalization_hook,
  reference_tier_used,
  confidence_score,
  scraped_content,
  fabrication_retry_count,
  enrichment_status,
  approval_status,
  icp_qualification_status,
  dedup_status,
  created_at,
  updated_at
FROM public.outreach_leads
WHERE enrichment_status = 'enriched'
  AND personalization_hook IS NOT NULL
  AND fabrication_severity IS NULL
  AND instantly_synced_at IS NULL
  AND icp_qualification_status = 'QUALIFIED'
  AND dedup_status = ANY (ARRAY['singleton', 'primary', 'manual_override_approved'])
  AND approval_status = 'approved'
ORDER BY created_at ASC;

COMMENT ON VIEW public.pending_fabrication_check_leads IS
  'Leads ready for Safeguard 3 (Fabrication Detector). Polled every 10 minutes by n8n.';

-- ----------------------------------------------------------------------------
-- Phase 3: REPLACE pending_push_leads view
--   Now gates behind fabrication_severity IN (NONE, MINOR) OR NULL (backward compat)
--   Production lead flow:
--     enriched + NULL severity → Safeguard 3 polls within 10 min
--     Safeguard 3 writes NONE/MINOR/MAJOR
--     NONE/MINOR → eligible for pending_push_leads → Stage 5 picks up
--     MAJOR → blocked from pending_push_leads → retry or Slack escalation
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.pending_push_leads;

CREATE VIEW public.pending_push_leads
WITH (security_invoker = true) AS
SELECT
  id,
  email,
  first_name,
  last_name,
  company_name,
  company_name_normalized,
  company_website,
  personalization_hook,
  confidence_score,
  reference_tier_used,
  icp_qualification_status,
  dedup_status,
  dedup_sibling_count,
  approval_status,
  enrichment_status,
  instantly_synced_at,
  fabrication_severity,
  fabrication_retry_count,
  scraped_content,
  created_at,
  updated_at
FROM public.outreach_leads
WHERE icp_qualification_status = 'QUALIFIED'
  AND dedup_status = ANY (ARRAY['singleton', 'primary', 'manual_override_approved'])
  AND approval_status = 'approved'
  AND instantly_synced_at IS NULL
  AND enrichment_status = 'enriched'
  AND (fabrication_severity IN ('NONE', 'MINOR') OR fabrication_severity IS NULL);

COMMENT ON VIEW public.pending_push_leads IS
  'Leads ready for Stage 5 (Push to Instantly). Gates behind Safeguard 3 fabrication clearance.';

-- ----------------------------------------------------------------------------
-- Phase 4: Verification queries — run AFTER migration completes
--   These are SELECTs only. Safe to run repeatedly.
-- ----------------------------------------------------------------------------

-- Verify columns added
-- Expected: 6 rows
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'outreach_leads'
  AND column_name IN (
    'fabrication_flags',
    'fabrication_severity',
    'suggested_rewrite',
    'fabrication_retry_count',
    'fabrication_checked_at',
    'fabrication_method'
  )
ORDER BY column_name;

-- Verify both views are security_invoker
-- Expected: 2 rows, both with security_invoker = on
SELECT
  c.relname AS view_name,
  pg_options_to_table(c.reloptions) AS view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('pending_push_leads', 'pending_fabrication_check_leads')
  AND c.relkind = 'v';

-- Verify pending_fabrication_check_leads polling state
-- Expected: should reflect any enriched leads with NULL fabrication_severity
SELECT
  count(*) FILTER (WHERE fabrication_severity IS NULL)        AS pending_check,
  count(*) FILTER (WHERE fabrication_severity = 'NONE')        AS severity_none,
  count(*) FILTER (WHERE fabrication_severity = 'MINOR')       AS severity_minor,
  count(*) FILTER (WHERE fabrication_severity = 'MAJOR')       AS severity_major,
  count(*) FILTER (WHERE enrichment_status = 'enriched')       AS total_enriched,
  count(*)                                                     AS total_leads
FROM public.outreach_leads;

-- Sample 5 leads from pending_fabrication_check_leads to confirm view works
SELECT id, email, first_name, last_name, company_name, fabrication_retry_count
FROM public.pending_fabrication_check_leads
LIMIT 5;

-- Sample 5 leads from pending_push_leads to confirm grandfathered leads still flow
-- Expected: the 16 production leads should still appear (fabrication_severity IS NULL is eligible)
SELECT id, email, company_name, fabrication_severity, instantly_synced_at
FROM public.pending_push_leads
LIMIT 5;

-- ============================================================================
-- END Migration 005
-- ============================================================================
