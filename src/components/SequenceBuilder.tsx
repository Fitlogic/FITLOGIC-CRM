import { useState } from "react";
import { Plus, Trash2, ArrowDown, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SequenceStep {
  id: string;
  step_number: number;
  subject: string;
  body_html: string;
  delay_days: number;
}

interface SequenceBuilderProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
}

const COLD_EMAIL_TIPS: Record<number, string> = {
  1: "Opening email — introduce yourself and value prop. Keep it under 100 words. Ask one clear question.",
  2: "Follow-up #1 — Reference the first email. Add social proof or a case study. Wait 2-3 days.",
  3: "Follow-up #2 — Different angle. Share a relevant insight or resource. Wait 3-4 days.",
  4: "Follow-up #3 — Create urgency or share a time-sensitive offer. Wait 4-5 days.",
  5: "Break-up email — Let them know this is your last follow-up. Often gets the highest reply rate.",
};

export function SequenceBuilder({ steps, onChange }: SequenceBuilderProps) {
  const addStep = () => {
    const nextNum = steps.length + 1;
    onChange([
      ...steps,
      {
        id: `step-${Date.now()}`,
        step_number: nextNum,
        subject: "",
        body_html: "",
        delay_days: nextNum === 1 ? 0 : nextNum <= 3 ? 3 : 4,
      },
    ]);
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStep = (id: string) => {
    const filtered = steps.filter((s) => s.id !== id);
    onChange(filtered.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const totalDays = steps.reduce((sum, s) => sum + s.delay_days, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm text-foreground">Email Sequence</h3>
          <p className="text-xs text-muted-foreground">
            {steps.length} email{steps.length !== 1 ? "s" : ""} over {totalDays} days
          </p>
        </div>
        {steps.length < 5 && (
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="h-3 w-3 mr-1" /> Add Step
          </Button>
        )}
      </div>

      {steps.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-3">Build a multi-step email sequence</p>
            <Button size="sm" className="gradient-brand text-primary-foreground" onClick={addStep}>
              <Plus className="h-3 w-3 mr-1" /> Add First Email
            </Button>
          </CardContent>
        </Card>
      )}

      {steps.map((step, idx) => (
        <div key={step.id}>
          {idx > 0 && (
            <div className="flex items-center gap-2 py-2 px-4">
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Wait</span>
                <Select
                  value={String(step.delay_days)}
                  onValueChange={(v) => updateStep(step.id, { delay_days: parseInt(v) })}
                >
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 7, 10, 14].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} day{d !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Card className="border-l-4 border-l-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Step {step.step_number}
                  </Badge>
                  {COLD_EMAIL_TIPS[step.step_number] && (
                    <span className="text-[10px] text-muted-foreground italic max-w-md truncate">
                      💡 {COLD_EMAIL_TIPS[step.step_number]}
                    </span>
                  )}
                </div>
                {steps.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-destructive hover:text-destructive"
                    onClick={() => removeStep(step.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Subject Line</Label>
                <Input
                  value={step.subject}
                  onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                  placeholder={`Email ${step.step_number} subject...`}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Email Body (HTML)</Label>
                <Textarea
                  value={step.body_html}
                  onChange={(e) => updateStep(step.id, { body_html: e.target.value })}
                  placeholder="Write your email content..."
                  className="mt-1 text-sm font-mono min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {steps.length > 0 && steps.length < 5 && (
        <Button variant="outline" size="sm" className="w-full" onClick={addStep}>
          <Plus className="h-3 w-3 mr-1" /> Add Another Email
        </Button>
      )}
    </div>
  );
}
