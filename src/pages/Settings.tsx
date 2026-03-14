import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
    <div className="rounded-2xl gradient-brand p-5 mb-4 shadow-glow">
      <SettingsIcon className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Settings</h3>
    <p className="text-sm mb-1">Practice config, staff management, integrations</p>
    <p className="text-xs text-muted-foreground/60">Coming in Phase 4</p>
  </div>
);

export default Settings;
