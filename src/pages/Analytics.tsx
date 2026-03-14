import { BarChart3 } from "lucide-react";

const Analytics = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
    <div className="rounded-2xl gradient-brand p-5 mb-4 shadow-glow">
      <BarChart3 className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Analytics</h3>
    <p className="text-sm mb-1">Key metrics, trends, and performance reports</p>
    <p className="text-xs text-muted-foreground/60">Coming in Phase 4</p>
  </div>
);

export default Analytics;
