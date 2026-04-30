
-- Fix function search path warnings
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.audit_patient_changes() SET search_path = public;
