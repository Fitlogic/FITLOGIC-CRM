
-- Staff members
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'receptionist',
  email TEXT NOT NULL,
  categories_handled TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FAQs
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General_Info',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inquiries linked to patients
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  source TEXT NOT NULL DEFAULT 'email',
  raw_content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General_Info',
  category_confidence NUMERIC(3,2) DEFAULT 0.9,
  is_faq_match BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_text TEXT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Intake form templates
CREATE TABLE public.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intake submissions linked to patients
CREATE TABLE public.intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.intake_forms(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  submission_data JSONB NOT NULL DEFAULT '{}',
  completion_status TEXT NOT NULL DEFAULT 'incomplete',
  review_status TEXT NOT NULL DEFAULT 'pending',
  staff_notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT,
  category TEXT NOT NULL DEFAULT 'welcome',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segments
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  estimated_count INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Temporary open policies (locked down with auth later)
CREATE POLICY "public_staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_faqs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_intake_forms" ON public.intake_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_intake_submissions" ON public.intake_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_email_templates" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_segments" ON public.segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- Auto-find or create patient from contact info
CREATE OR REPLACE FUNCTION public.find_or_create_patient(
  p_name TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_parts TEXT[];
  v_first TEXT;
  v_last TEXT;
BEGIN
  -- Try to find by email first
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT id INTO v_patient_id FROM public.patients WHERE email = p_email LIMIT 1;
    IF v_patient_id IS NOT NULL THEN RETURN v_patient_id; END IF;
  END IF;

  -- Split name
  v_parts := string_to_array(trim(p_name), ' ');
  v_first := v_parts[1];
  v_last := CASE WHEN array_length(v_parts, 1) > 1 THEN array_to_string(v_parts[2:], ' ') ELSE '' END;

  -- Try to find by name
  SELECT id INTO v_patient_id FROM public.patients 
  WHERE first_name = v_first AND last_name = v_last LIMIT 1;
  IF v_patient_id IS NOT NULL THEN RETURN v_patient_id; END IF;

  -- Create new patient
  INSERT INTO public.patients (first_name, last_name, email, status)
  VALUES (v_first, v_last, NULLIF(p_email, ''), 'active')
  RETURNING id INTO v_patient_id;

  RETURN v_patient_id;
END;
$$;

-- Updated_at triggers for new tables
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER intake_forms_updated_at BEFORE UPDATE ON public.intake_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
