-- Auto-sync `patients.status` when pipeline_stage flips to 'lost'.
--
-- Mirror of migration 20260502000003 (won → active). Together they keep
-- the two columns in lockstep regardless of which code path moves the
-- pipeline (kanban drag, AI suggestion, manual edit, bulk import, direct
-- SQL).
--
-- Status values referenced:
--   lead     → prospect we're actively working
--   active   → won deal (paying client)
--   cold     → lost deal (didn't convert)
--   inactive → legacy bucket; kept for old rows
--   archived → manually closed out
--
-- Backfill: set status='cold' for every existing patient whose
-- pipeline_stage='lost' but status hasn't been updated yet.

CREATE OR REPLACE FUNCTION sync_status_from_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    -- won  → active
    IF NEW.pipeline_stage = 'won'
       AND (NEW.status IN ('lead', 'inactive', 'cold') OR NEW.status IS NULL)
    THEN
      NEW.status := 'active';
    END IF;
    -- lost → cold
    IF NEW.pipeline_stage = 'lost'
       AND (NEW.status IN ('lead', 'inactive', 'active') OR NEW.status IS NULL)
    THEN
      NEW.status := 'cold';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger from migration 20260502000003 already exists; replacing the
-- function above is enough. Recreate the trigger defensively so a fresh
-- environment that runs only this migration still gets it.
DROP TRIGGER IF EXISTS trg_sync_status_from_pipeline_stage ON patients;
CREATE TRIGGER trg_sync_status_from_pipeline_stage
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_from_pipeline_stage();

-- Backfill — bring existing rows into the new state machine.
UPDATE patients
   SET status = 'cold'
 WHERE pipeline_stage = 'lost'
   AND (status IN ('lead', 'inactive', 'active') OR status IS NULL);

UPDATE patients
   SET status = 'active'
 WHERE pipeline_stage = 'won'
   AND (status IN ('lead', 'inactive', 'cold') OR status IS NULL);

COMMENT ON FUNCTION sync_status_from_pipeline_stage() IS
  'pipeline_stage=won → status=active. pipeline_stage=lost → status=cold. Skips rows already explicitly archived.';
