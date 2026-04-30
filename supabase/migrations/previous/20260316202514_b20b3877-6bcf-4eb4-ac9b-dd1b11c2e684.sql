
-- Campaign recipients: link campaigns to actual contacts
CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'customer',  -- 'customer', 'csv_import', 'manual'
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'skipped'
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  current_step INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_campaign_recipients" ON public.campaign_recipients FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_email ON public.campaign_recipients(email);

-- Campaign schedule settings
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_sends_per_day INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS business_hours_start INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS business_hours_end INTEGER DEFAULT 18,
  ADD COLUMN IF NOT EXISTS business_days TEXT[] DEFAULT '{Mon,Tue,Wed,Thu,Fri}'::text[],
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMP WITH TIME ZONE;
