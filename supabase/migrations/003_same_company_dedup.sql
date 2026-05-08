-- =============================================================================
-- Migration 003: Same-Company Dedup + Push Sync Infrastructure
-- =============================================================================
-- Priority 3 Phase 3a (v4 — Step 7 removed, orchestrator metrics deferred)
-- Author: HarvestFile automation build
-- Date: April 19, 2026
--
-- Corrections across versions:
--   v1 → v2: automation_audit_log schema column names corrected
--            (.status → .event_status, .payload → .error_details)
--   v2 → v3: pending_push_leads view marked WITH (security_invoker = true)
--   v3 → v4: REMOVED attempt to replace get_orchestrator_metrics() function.
--            The live function created by Migration 002 has a different return
--            signature AND returns keys the Master Orchestrator workflow
--            actively consumes. Replacing it in Phase 3a would risk breaking
--            the 6 AM daily heartbeat. The correct place to extend orchestrator
--            metrics additively (preserving all existing keys, adding dedup
--            keys) is Phase 3e when we rebuild the Master Orchestrator workflow
--            v1.1 and can test function + workflow changes together.
--
-- What this migration does (v4):
--   1. Adds 5 dedup columns to outreach_leads
--   2. Adds CHECK constraint on dedup_status
--   3. Creates normalize_company_name() function
--   4. Creates elect_dedup_status() function (called by Safeguard 2)
--   5. Creates 3 indexes for dedup performance
--   6. Creates pending_push_leads view (security_invoker=true, RLS-respecting)
--   7. REMOVED — deferred to Phase 3e Master Orchestrator v1.1
--   8. Backfills existing 25 leads with Drew-cleanup already applied:
--        - 16 already-synced leads → dedup_status='primary' (grandfather)
--        - Remaining 9 leads → company_name_normalized populated, dedup_status NULL
--   9. Writes migration audit row
--
-- Idempotency: all statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS
-- so this entire file can be safely re-run as many times as needed. Re-running
-- after a partial application will complete the remaining steps and write a
-- fresh audit row documenting the final state.
-- =============================================================================


-- =============================================================================
-- STEP 1: Column additions to outreach_leads
-- =============================================================================

ALTER TABLE outreach_leads
  ADD COLUMN IF NOT EXISTS company_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS dedup_status TEXT,
  ADD COLUMN IF NOT EXISTS dedup_primary_lead_id UUID REFERENCES outreach_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedup_sibling_count INTEGER,
  ADD COLUMN IF NOT EXISTS dedup_evaluated_at TIMESTAMPTZ;

COMMENT ON COLUMN outreach_leads.company_name_normalized IS
  'Migration 003: Lowercase, trimmed, suffix-stripped form of company_name. Dedup key.';
COMMENT ON COLUMN outreach_leads.dedup_status IS
  'Migration 003: singleton | primary | deferred_to_primary | primary_released | manual_override_approved | NULL (unevaluated).';
COMMENT ON COLUMN outreach_leads.dedup_primary_lead_id IS
  'Migration 003: For deferred siblings, points to the primary lead they are waiting behind.';
COMMENT ON COLUMN outreach_leads.dedup_sibling_count IS
  'Migration 003: Count of other leads at same normalized company at time of evaluation.';
COMMENT ON COLUMN outreach_leads.dedup_evaluated_at IS
  'Migration 003: Timestamp when Safeguard 2 last evaluated this lead.';


-- =============================================================================
-- STEP 2: CHECK constraint on dedup_status
-- =============================================================================

ALTER TABLE outreach_leads
  DROP CONSTRAINT IF EXISTS outreach_leads_dedup_status_check;

ALTER TABLE outreach_leads
  ADD CONSTRAINT outreach_leads_dedup_status_check
  CHECK (
    dedup_status IS NULL
    OR dedup_status IN (
      'singleton',
      'primary',
      'deferred_to_primary',
      'primary_released',
      'manual_override_approved'
    )
  );


-- =============================================================================
-- STEP 3: Company name normalization function
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_company_name(raw_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF raw_name IS NULL OR TRIM(raw_name) = '' THEN
    RETURN NULL;
  END IF;

  normalized := LOWER(TRIM(raw_name));

  -- Strip trailing corporate suffixes (multiple passes for compound suffixes like "Insurance LLC")
  FOR i IN 1..3 LOOP
    normalized := REGEXP_REPLACE(
      normalized,
      '[[:space:],.]+(llc|l\.l\.c\.|inc|inc\.|incorporated|corp|corp\.|corporation|co|co\.|company|ltd|ltd\.|limited|group|agency|insurance|services|enterprises|holdings|partners|brokerage|associates)\s*$',
      '',
      'gi'
    );
  END LOOP;

  normalized := REGEXP_REPLACE(normalized, '[^a-z0-9\- ]', '', 'g');
  normalized := REGEXP_REPLACE(normalized, '\s+', ' ', 'g');
  normalized := TRIM(normalized);

  IF normalized = '' THEN
    RETURN NULL;
  END IF;

  RETURN normalized;
END;
$$;

COMMENT ON FUNCTION normalize_company_name(TEXT) IS
  'Migration 003: Normalizes company names for dedup matching. Strips LLC/Inc/Group/Insurance/etc suffixes and punctuation.';


-- =============================================================================
-- STEP 4: Indexes for dedup performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_outreach_leads_company_normalized
  ON outreach_leads (company_name_normalized);

CREATE INDEX IF NOT EXISTS idx_outreach_leads_dedup_status
  ON outreach_leads (dedup_status);

CREATE INDEX IF NOT EXISTS idx_outreach_leads_dedup_composite
  ON outreach_leads (company_name_normalized, dedup_status, approval_status);


-- =============================================================================
-- STEP 5: elect_dedup_status() — called by Safeguard 2 workflow
-- =============================================================================

CREATE OR REPLACE FUNCTION elect_dedup_status(p_lead_id UUID)
RETURNS TABLE (
  elected_status TEXT,
  primary_lead_id UUID,
  sibling_count INTEGER,
  normalized_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized TEXT;
  v_raw_name TEXT;
  v_sibling_count INTEGER;
  v_active_primary_id UUID;
  v_elected TEXT;
BEGIN
  SELECT company_name INTO v_raw_name
  FROM outreach_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'elect_dedup_status: lead % not found', p_lead_id;
  END IF;

  v_normalized := normalize_company_name(v_raw_name);

  IF v_normalized IS NULL THEN
    v_elected := 'singleton';
    v_sibling_count := 0;
    v_active_primary_id := NULL;
  ELSE
    SELECT COUNT(*) INTO v_sibling_count
    FROM outreach_leads
    WHERE company_name_normalized = v_normalized
      AND id != p_lead_id;

    IF v_sibling_count = 0 THEN
      v_elected := 'singleton';
      v_active_primary_id := NULL;
    ELSE
      SELECT id INTO v_active_primary_id
      FROM outreach_leads
      WHERE company_name_normalized = v_normalized
        AND id != p_lead_id
        AND dedup_status IN ('primary', 'singleton', 'manual_override_approved')
        AND (approval_status IS NULL OR approval_status NOT IN ('rejected', 'sequence_complete'))
      ORDER BY
        (instantly_synced_at IS NOT NULL) DESC,
        created_at ASC
      LIMIT 1;

      IF v_active_primary_id IS NOT NULL THEN
        v_elected := 'deferred_to_primary';
      ELSE
        v_elected := 'primary';
      END IF;
    END IF;
  END IF;

  UPDATE outreach_leads
  SET
    company_name_normalized = v_normalized,
    dedup_status = v_elected,
    dedup_primary_lead_id = CASE
      WHEN v_elected = 'deferred_to_primary' THEN v_active_primary_id
      ELSE NULL
    END,
    dedup_sibling_count = v_sibling_count,
    dedup_evaluated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN QUERY SELECT v_elected, v_active_primary_id, v_sibling_count, v_normalized;
END;
$$;

COMMENT ON FUNCTION elect_dedup_status(UUID) IS
  'Migration 003: Elects dedup_status for a lead. Called by Safeguard 2 workflow after Safeguard 1 qualifies a lead.';


-- =============================================================================
-- STEP 6: pending_push_leads view
-- =============================================================================
-- WITH (security_invoker = true): this view runs with the CALLING user's
-- permissions, not the creator's. RLS on outreach_leads is respected.

DROP VIEW IF EXISTS pending_push_leads;

CREATE VIEW pending_push_leads
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
  created_at,
  updated_at
FROM outreach_leads
WHERE
  icp_qualification_status = 'QUALIFIED'
  AND dedup_status IN ('singleton', 'primary', 'manual_override_approved')
  AND approval_status = 'approved'
  AND instantly_synced_at IS NULL
  AND enrichment_status = 'enriched';

COMMENT ON VIEW pending_push_leads IS
  'Migration 003: Single source of truth for leads eligible to be pushed to Instantly. Used by Push Enriched Leads workflow (Phase 3d). Uses security_invoker=true to respect caller RLS.';


-- =============================================================================
-- STEP 7: REMOVED in v4
-- =============================================================================
-- Originally contained a CREATE OR REPLACE FUNCTION get_orchestrator_metrics()
-- that would have replaced the live Migration 002 version. That replacement
-- was BOTH mechanically broken (different return signature, would trigger
-- PostgreSQL error 42P13) AND semantically dangerous (the live Master
-- Orchestrator workflow consumes a specific set of keys from the current
-- function; replacing it mid-Phase-3a would break tomorrow's 6 AM heartbeat).
--
-- The correct home for orchestrator metrics extension is Phase 3e (Master
-- Orchestrator v1.1), where we'll additively extend the existing function —
-- preserving EVERY current key the workflow reads, then adding dedup and
-- push-funnel keys — and update the workflow to consume the new keys in the
-- same deployment. Paired changes, paired testing.
--
-- Until Phase 3e ships, the existing Migration 002 get_orchestrator_metrics()
-- continues to run correctly. Daily heartbeats at 6 AM ET remain healthy.


-- =============================================================================
-- STEP 8: Backfill existing leads
-- =============================================================================

-- 8a: Populate company_name_normalized for ALL existing leads
UPDATE outreach_leads
SET
  company_name_normalized = normalize_company_name(company_name),
  updated_at = NOW()
WHERE company_name_normalized IS NULL;

-- 8b: Grandfather already-synced leads as dedup_status='primary'
--   After Drew cleanup, this matches exactly 16 rows (the Instantly-live leads).
UPDATE outreach_leads
SET
  dedup_status = 'primary',
  dedup_sibling_count = (
    SELECT COUNT(*) - 1
    FROM outreach_leads sibling
    WHERE sibling.company_name_normalized = outreach_leads.company_name_normalized
  ),
  dedup_evaluated_at = NOW(),
  updated_at = NOW()
WHERE instantly_synced_at IS NOT NULL
  AND dedup_status IS NULL;


-- =============================================================================
-- STEP 9: Migration audit log entry
-- =============================================================================

INSERT INTO automation_audit_log (
  workflow_name,
  event_type,
  event_status,
  error_details,
  triggered_by,
  created_at
)
VALUES (
  'migration_003',
  'migration_applied',
  'success',
  jsonb_build_object(
    'migration', '003_same_company_dedup',
    'version', 'v4 — Step 7 (orchestrator metrics replacement) removed; deferred to Phase 3e',
    'columns_added', ARRAY['company_name_normalized','dedup_status','dedup_primary_lead_id','dedup_sibling_count','dedup_evaluated_at'],
    'functions_added', ARRAY['normalize_company_name','elect_dedup_status'],
    'functions_updated', ARRAY[]::TEXT[],
    'views_added', ARRAY['pending_push_leads (security_invoker=true)'],
    'indexes_added', ARRAY['idx_outreach_leads_company_normalized','idx_outreach_leads_dedup_status','idx_outreach_leads_dedup_composite'],
    'constraints_added', ARRAY['outreach_leads_dedup_status_check'],
    'backfill_strategy', 'grandfather_synced_as_primary',
    'prerequisites', 'Drew Federau sync-state cleanup applied first (priority_3_phase_3a_precleanup audit row)',
    'deferred_to_phase_3e', 'get_orchestrator_metrics() additive extension to include dedup_* and pending_push_count keys',
    'security_note', 'View created with security_invoker=true so RLS on underlying outreach_leads is respected by calling user permissions'
  ),
  'manual_sql_editor',
  NOW()
);


-- =============================================================================
-- DONE
-- =============================================================================
SELECT 'Migration 003 complete.' AS status;
