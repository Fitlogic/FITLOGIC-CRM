
-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for HIPAA compliance
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by TEXT
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Temporary public read/write policies (will be locked down when auth is added)
CREATE POLICY "Allow all access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Audit trigger for patients
CREATE OR REPLACE FUNCTION public.audit_patient_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data)
    VALUES ('patients', NEW.id, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data)
    VALUES ('patients', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data)
    VALUES ('patients', OLD.id, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER patients_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_patient_changes();
