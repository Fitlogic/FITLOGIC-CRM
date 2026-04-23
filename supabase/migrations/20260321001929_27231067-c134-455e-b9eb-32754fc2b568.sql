
-- Campaign send log for tracking individual email sends
CREATE TABLE public.campaign_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  step_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  error_message text,
  tracking_id text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_campaign_send_log" ON public.campaign_send_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_send_log_campaign ON public.campaign_send_log(campaign_id);
CREATE INDEX idx_send_log_recipient ON public.campaign_send_log(recipient_id);
CREATE INDEX idx_send_log_tracking ON public.campaign_send_log(tracking_id);
CREATE INDEX idx_send_log_status ON public.campaign_send_log(status);

-- Unsubscribe list
CREATE TABLE public.campaign_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id),
  unsubscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.campaign_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_campaign_unsubscribes" ON public.campaign_unsubscribes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_unsubscribes_email ON public.campaign_unsubscribes(email);
