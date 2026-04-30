
-- Attach audit trigger to patients table
CREATE TRIGGER trg_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.audit_patient_changes();

-- Also add update_updated_at trigger for patients
CREATE TRIGGER trg_update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
