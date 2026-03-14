import { Users } from "lucide-react";

const Patients = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
    <div className="rounded-2xl gradient-brand p-5 mb-4 shadow-glow">
      <Users className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Patient CRM</h3>
    <p className="text-sm mb-1">Full patient database, profiles, and interaction timeline</p>
    <p className="text-xs text-muted-foreground/60">Coming in Phase 4</p>
  </div>
);

export default Patients;
