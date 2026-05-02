-- Per-campaign processing lock so the cron and a manual "Send Now" click
-- can't both grab the same pending recipient and double-send. The lock is
-- a timestamp on `campaigns`. The queue claims the lock with an atomic
-- `UPDATE ... WHERE id=$1 AND (last_processed_at IS NULL OR last_processed_at < now() - interval '5 minutes') RETURNING ...`.
-- Whoever gets a row back proceeds; the loser sees zero rows back and skips.
--
-- The 5-minute window is generous enough to cover the longest expected
-- queue run (the queue caps at 500 recipients × ~1s/send ≈ 8min worst case
-- with retries, but in practice it's far faster). If a run truly hangs,
-- after 5 minutes another invocation can pick up where it left off.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN campaigns.last_processed_at IS
  'Set at the START of a queue run to claim a per-campaign lock. The cron + manual queue both check this to avoid double-processing. Cleared implicitly by passing 5 minutes since the value was written.';

CREATE INDEX IF NOT EXISTS idx_campaigns_last_processed_at ON campaigns (last_processed_at);
