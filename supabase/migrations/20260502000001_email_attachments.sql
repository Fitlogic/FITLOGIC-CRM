-- Persist email attachments per template / sequence step.
--
-- Attachments are stored inline as JSONB:
--   [{ "filename": "...", "content": "<base64>", "mimeType": "...", "size": 12345 }]
--
-- The 25 MB total cap enforced in the editor (RichEmailEditor.tsx) keeps row
-- size manageable. The campaign queue + cron read these and forward them to
-- Resend / Gmail at send time via @/lib/emailSender.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE campaign_sequences
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN email_templates.attachments IS
  'Per-template file attachments. JSONB array of { filename, content (base64), mimeType, size }. Forwarded by the campaign queue at send time.';

COMMENT ON COLUMN campaign_sequences.attachments IS
  'Per-step file attachments. JSONB array of { filename, content (base64), mimeType, size }. Forwarded by the campaign queue at send time. Override ONLY — when empty, no attachments are sent for that step.';
