import { useState } from "react";
import { Sparkles, Loader2, Eye, Check, Lightbulb, Clock, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { Segment } from "@/lib/campaign-data";

interface AICampaignResult {
  campaignName: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
  category: "welcome" | "followup" | "promotional" | "educational" | "reactivation";
  suggestedSegment: string;
  sendTimeRecommendation: string;
  rationale: string;
}

interface AICampaignCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: Segment[];
  onAccept: (result: AICampaignResult) => void;
}

const EXAMPLE_PROMPTS = [
  "Re-engage patients who haven't visited in 6+ months with a seasonal wellness check-in",
  "Welcome new patients with an intro to our functional medicine approach",
  "Promote our new hormone health workshop next month",
  "Send a follow-up to patients who completed intake forms this week",
];

export function AICampaignCreator({ open, onOpenChange, segments, onAccept }: AICampaignCreatorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AICampaignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-campaign", {
        body: {
          prompt: prompt.trim(),
          segments: segments.map((s) => ({ name: s.name, description: s.description, estimatedCount: s.estimatedCount })),
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResult(data as AICampaignResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate campaign");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onAccept(result);
      handleReset();
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setResult(null);
    setError(null);
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Campaign Creator
          </DialogTitle>
          <DialogDescription>
            Describe your campaign goal and AI will generate everything — subject, copy, audience, and timing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {!result ? (
            <div className="space-y-4 py-2">
              <Textarea
                placeholder="Describe your campaign goal... e.g., 'Re-engage patients who haven't visited in 6 months with a wellness check-in offer'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />

              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Try one of these:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ep) => (
                    <button
                      key={ep}
                      onClick={() => setPrompt(ep)}
                      disabled={isGenerating}
                      className="text-xs px-2.5 py-1.5 rounded-full border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      {ep.length > 60 ? ep.slice(0, 60) + "…" : ep}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Result header */}
              <div className="rounded-lg border bg-primary/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{result.campaignName}</h3>
                    <Badge variant="outline" className="mt-1 text-[10px]">{result.category}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    AI Generated
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic mt-2">{result.rationale}</p>
              </div>

              {/* Email preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Email Content</h4>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs">
                    <span className="text-muted-foreground">Subject:</span>{" "}
                    <span className="font-medium">{result.subject}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Preview:</span>{" "}
                    <span className="text-muted-foreground">{result.previewText}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-3 w-3 mr-1" />
                  {showPreview ? "Hide" : "Show"} Email Body
                </Button>
                {showPreview && (
                  <div className="rounded-lg border bg-card p-4 text-sm" dangerouslySetInnerHTML={{ __html: result.bodyHtml }} />
                )}
              </div>

              <Separator />

              {/* Strategy details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Suggested Audience</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{result.suggestedSegment}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Best Send Time</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{result.sendTimeRecommendation}</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                className="gradient-brand text-primary-foreground"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Generate Campaign
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Start Over
              </Button>
              <Button className="gradient-brand text-primary-foreground" onClick={handleAccept}>
                <Check className="h-4 w-4 mr-1.5" />
                Use This Campaign
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
