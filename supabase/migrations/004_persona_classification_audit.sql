-- =============================================================================
-- Migration 004: Persona Classification Audit + Dispatcher Polling Infrastructure
-- =============================================================================
-- Priority 3 Phase 3c-i
-- Author: HarvestFile automation build
-- Date: April 19, 2026
--
-- What this migration does:
--   1. Adds persona_classification_keyword column (forensic audit of classifier)
--   2. Adds persona_classification_source column (which field matched)
--   3. Adds composite index for Dispatcher poll performance
--   4. Adds index on persona for funnel metrics
--   5. Creates pending_qualification_leads view (Dispatcher single source of truth)
--   6. Writes migration audit row
--
-- Prerequisites:
--   - Migration 003 applied (dedup columns + pending_push_leads view)
--   - automation_audit_log table exists with event_status + error_details columns
--
-- Safety:
--   - Idempotent: every ADD COLUMN uses IF NOT EXISTS
--   - No destructive operations (no DROP TABLE, no DELETE on production data)
--   - New columns are nullable, no backfill required for existing 25 leads
--   - View uses security_invoker=true per Phase 3a-learned pattern
--
-- Deferred to later phases (intentionally NOT in this migration):
--   - Phase 3e: get_orchestrator_metrics() extension to include persona funnel
--   - Phase 3c-ii: Transform + Dedup node classification logic (in n8n, not SQL)
-- =============================================================================


-- =============================================================================
-- STEP 1: Column additions to outreach_leads
-- =============================================================================

ALTER TABLE outreach_leads
  ADD COLUMN IF NOT EXISTS persona_classification_keyword TEXT,
  ADD COLUMN IF NOT EXISTS persona_classification_source TEXT;

COMMENT ON COLUMN outreach_leads.persona_classification_keyword IS
  'Migration 004: The keyword string that matched during persona classification (e.g., "crop insurance", "extension educator"). NULL for hardcoded or legacy imports. Informational only — not constrained.';

COMMENT ON COLUMN outreach_leads.persona_classification_source IS
  'Migration 004: Which field the classifier matched against (job_title | company_name | company_website | hardcoded_default | fallback_other). Informational only — not constrained.';


-- =============================================================================
-- STEP 2: Indexes for Dispatcher performance
-- =============================================================================

-- Composite index supporting the Dispatcher's primary poll query:
--   SELECT id FROM outreach_leads
--   WHERE icp_qualification_status IS NULL AND persona IS NOT NULL
--   ORDER BY created_at ASC LIMIT N
-- This index makes that query use an index scan instead of a sequential scan
-- as lead volume grows past a few thousand rows.

CREATE INDEX IF NOT EXISTS idx_outreach_leads_dispatcher_poll
  ON outreach_leads (icp_qualification_status, persona, created_at)
  WHERE icp_qualification_status IS NULL AND persona IS NOT NULL;

-- Index on persona alone for future funnel metrics (GROUP BY persona queries).
CREATE INDEX IF NOT EXISTS idx_outreach_leads_persona
  ON outreach_leads (persona);


-- =============================================================================
-- STEP 3: pending_qualification_leads view
-- =============================================================================
-- Single source of truth for the Lead Qualification Dispatcher workflow.
-- The Dispatcher queries ONLY this view. If we ever refine the "ready for
-- qualification" criteria, we change it here and the Dispatcher automatically
-- picks up the change.
--
-- Criteria:
--   - Lead has been classified into a persona by the Apollo Import classifier
--     (persona IS NOT NULL — all 5 valid values qualify)
--   - Lead has NOT yet been ICP-qualified by Safeguard 1
--   - Lead is not in an excluded enrichment state (not archived, not rejected)
--
-- security_invoker=true so RLS of outreach_leads is respected by calling user.

DROP VIEW IF EXISTS pending_qualification_leads;

CREATE VIEW pending_qualification_leads
WITH (security_invoker = true) AS
SELECT
  id,
  email,
  first_name,
  last_name,
  company_name,
  company_website,
  job_title,
  city,
  state,
  persona,
  persona_classification_keyword,
  persona_classification_source,
  source,
  enrichment_status,
  created_at
FROM outreach_leads
WHERE
  persona IS NOT NULL
  AND icp_qualification_status IS NULL
  AND enrichment_status NOT IN ('archived', 'rejected')
ORDER BY created_at ASC;

COMMENT ON VIEW pending_qualification_leads IS
  'Migration 004: Single source of truth for Lead Qualification Dispatcher (Phase 3c-iii). Returns leads that have been classified into a persona by Apollo Import but not yet ICP-qualified by Safeguard 1. Uses security_invoker=true.';


-- =============================================================================
-- STEP 4: Migration audit log entry
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
  'migration_004',
  'migration_applied',
  'success',
  jsonb_build_object(
    'migration', '004_persona_classification_audit',
    'version', 'v1 — initial',
    'phase', 'Phase 3c-i',
    'columns_added', ARRAY['persona_classification_keyword','persona_classification_source'],
    'indexes_added', ARRAY['idx_outreach_leads_dispatcher_poll','idx_outreach_leads_persona'],
    'views_added', ARRAY['pending_qualification_leads (security_invoker=true)'],
    'functions_updated', ARRAY[]::TEXT[],
    'backfill_required', false,
    'prerequisites', 'Migration 003 applied, automation_audit_log schema confirmed',
    'enables', 'Phase 3c-ii (Apollo Import v2 classifier) + Phase 3c-iii (Lead Qualification Dispatcher)'
  ),
  'manual_sql_editor',
  NOW()
);


-- =============================================================================
-- DONE
-- =============================================================================
SELECT 'Migration 004 complete.' AS status;
