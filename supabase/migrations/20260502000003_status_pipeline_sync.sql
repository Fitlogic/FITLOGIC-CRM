-- Auto-sync `patients.status` with `patients.pipeline_stage`.
--
-- Business rule (from product spec):
--   When a contact's pipeline_stage flips to 'won', their status flips to
--   'active' (they're now a paying client, not a prospect).
--
-- A trigger guarantees this happens regardless of which code path moves the
-- pipeline_stage — kanban drag, AI suggestion, manual edit, bulk import,
-- direct SQL update during a backfill, or a future automation. App-level
-- syncing alone (in CampaignDetail / Index / Patients) would miss any of
-- these paths and let the two columns drift.
--
-- The reverse direction (email-send → pipeline_stage='contacted') is handled
-- in app code (src/lib/contact-sync.ts) because it needs to inspect the
-- current status to decide whether to promote.

CREATE OR REPLACE FUNCTION sync_status_from_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on actual pipeline_stage changes that land on 'won'.
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
     AND NEW.pipeline_stage = 'won'
  THEN
    -- Don't overwrite an explicit non-active status that was set in the
    -- same UPDATE (e.g. user simultaneously archived someone). Only promote
    -- if the incoming row keeps the prior status or sets it to lead/inactive.
    IF NEW.status IN ('lead', 'inactive') OR NEW.status IS NULL THEN
      NEW.status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_status_from_pipeline_stage ON patients;
CREATE TRIGGER trg_sync_status_from_pipeline_stage
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_from_pipeline_stage();

COMMENT ON FUNCTION sync_status_from_pipeline_stage() IS
  'When pipeline_stage flips to "won", promote status from "lead"/"inactive" to "active". Mirrors the business rule that a won deal = active client.';
