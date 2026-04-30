
-- Referral tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_name TEXT,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_referrals" ON public.referrals FOR ALL TO public USING (true) WITH CHECK (true);

-- Multi-email sequence support: campaign_sequences table
CREATE TABLE public.campaign_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL DEFAULT 1,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject_override TEXT,
  body_html_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_campaign_sequences" ON public.campaign_sequences FOR ALL TO public USING (true) WITH CHECK (true);

-- Add campaign_type to campaigns (single vs sequence)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'single';
