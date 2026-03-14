import { Mail } from "lucide-react";

const Campaigns = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
    <div className="rounded-2xl gradient-brand p-5 mb-4 shadow-glow">
      <Mail className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Email Campaigns</h3>
    <p className="text-sm mb-1">Campaign builder, segmentation, automation sequences</p>
    <p className="text-xs text-muted-foreground/60">Coming in Phase 3</p>
  </div>
);

export default Campaigns;
