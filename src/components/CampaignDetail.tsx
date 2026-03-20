import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Pencil, Clock, Pause, Play, Send, Eye, Users,
  AlertTriangle, ChevronDown, ChevronUp, Mail, Layers, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmailPreview } from "@/components/EmailPreview";
import { CampaignRecipients, type Recipient } from "@/components/CampaignRecipients";
import { CAMPAIGN_STATUS_CONFIG, type CampaignStatus } from "@/lib/types";

interface CampaignRow {
  id: string; name: string; status: string; campaign_type: string;
  template_id: string | null; segment_id: string | null;
  scheduled_at: string | null; sent_at: string | null; stats: any;
  created_at: string; updated_at: string;
  auto_schedule?: boolean; max_sends_per_day?: number;
  business_hours_start?: number; business_hours_end?: number;
  business_days?: string[];
  recipient_count?: number; sent_count?: number;
}

interface Props {
  campaign: CampaignRow;
  onBack: () => void;
  onEdit: (c: CampaignRow) => void;
}

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  delivered: "bg-status-resolved/10 text-status-resolved",
  opened: "bg-category-scheduling/10 text-category-scheduling",
  clicked: "bg-category-health/10 text-category-health",
  bounced: "bg-status-pending/10 text-status-pending",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

export function CampaignDetail({ campaign, onBack, onEdit }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cfg = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus] || CAMPAIGN_STATUS_CONFIG.draft;
  const [expandedSequence, setExpandedSequence] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState("overview");
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [newRecipients, setNewRecipients] = useState<Recipient[]>([]);

  const { data: recipients = [], refetch: refetchRecipients } = useQuery({
    queryKey: ["campaign-recipients", campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_recipients").select("*").eq("campaign_id", campaign.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ["campaign-sequences", campaign.id],
    queryFn: async () => {
      if (campaign.campaign_type !== "sequence") return [];
      const { data, error } = await supabase
        .from("campaign_sequences").select("*").eq("campaign_id", campaign.id).order("step_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: template } = useQuery({
    queryKey: ["campaign-template", campaign.template_id],
    queryFn: async () => {
      if (!campaign.template_id) return null;
      const { data, error } = await supabase
        .from("email_templates").select("*").eq("id", campaign.template_id).single();
      if (error) return null;
      return data;
    },
    enabled: !!campaign.template_id,
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ status, scheduled_at }: { status: string; scheduled_at?: string }) => {
      const upd: any = { status };
      if (scheduled_at) upd.scheduled_at = scheduled_at;
      const { error } = await supabase.from("campaigns").update(upd).eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const addRecipientsMut = useMutation({
    mutationFn: async (recs: Recipient[]) => {
      // Only add new emails (avoid duplicates within this campaign)
      const existingEmails = new Set(recipients.map(r => r.email.toLowerCase()));
      const toAdd = recs.filter(r => !existingEmails.has(r.email.toLowerCase()));
      if (toAdd.length === 0) throw new Error("All contacts are already in this campaign");
      
      const { error } = await supabase.from("campaign_recipients").insert(
        toAdd.map(r => ({
          campaign_id: campaign.id,
          email: r.email,
          name: r.name,
          patient_id: r.patient_id || null,
          source: r.source,
          status: "pending",
          current_step: 0,
        }))
      );
      if (error) throw error;

      // Update recipient count
      await supabase.from("campaigns").update({
        recipient_count: recipients.length + toAdd.length,
      }).eq("id", campaign.id);

      return toAdd.length;
    },
    onSuccess: (count) => {
      refetchRecipients();
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setShowAddRecipients(false);
      setNewRecipients([]);
      toast({ title: `Added ${count} recipient(s)` });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSchedule = () => {
    const scheduled = new Date(Date.now() + 86400000).toISOString();
    updateStatusMut.mutate({ status: "scheduled", scheduled_at: scheduled });
    toast({ title: "Campaign scheduled" });
  };

  const sentRecipients = recipients.filter(r => r.status !== "pending");
  const pendingRecipients = recipients.filter(r => r.status === "pending");
  const totalDays = sequences.reduce((sum: number, s: any) => sum + (s.delay_days || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold text-foreground">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`${cfg.bgColor} ${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
            {campaign.campaign_type === "sequence" && (
              <Badge variant="outline" className="text-[10px]">
                <Layers className="h-2.5 w-2.5 mr-0.5" />Sequence • {sequences.length} emails • {totalDays} days
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{recipients.length} recipients</span>
            {campaign.auto_schedule && (
              <Badge variant="outline" className="text-[10px] text-primary">
                <Clock className="h-2.5 w-2.5 mr-0.5" />Auto • {campaign.max_sends_per_day}/day
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddRecipients(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />Add People
          </Button>
          {campaign.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onEdit(campaign)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
              <Button size="sm" className="gradient-brand text-primary-foreground" onClick={handleSchedule} disabled={recipients.length === 0}>
                <Clock className="h-3.5 w-3.5 mr-1" />Schedule
              </Button>
            </>
          )}
          {campaign.status === "scheduled" && (
            <>
              <Button variant="outline" size="sm" onClick={() => updateStatusMut.mutate({ status: "paused" })}><Pause className="h-3.5 w-3.5 mr-1" />Pause</Button>
            </>
          )}
          {campaign.status === "paused" && (
            <Button size="sm" className="gradient-brand text-primary-foreground" onClick={handleSchedule}><Play className="h-3.5 w-3.5 mr-1" />Resume</Button>
          )}
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground">Recipients</p><p className="text-lg font-bold font-heading">{recipients.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-status-resolved/10 p-2.5"><Send className="h-4 w-4 text-status-resolved" /></div><div><p className="text-xs text-muted-foreground">Sent</p><p className="text-lg font-bold font-heading">{sentRecipients.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2.5"><Clock className="h-4 w-4 text-muted-foreground" /></div><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold font-heading">{pendingRecipients.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-category-scheduling/10 p-2.5"><Eye className="h-4 w-4 text-category-scheduling" /></div><div><p className="text-xs text-muted-foreground">Opened</p><p className="text-lg font-bold font-heading">{recipients.filter(r => r.opened_at).length}</p></div></CardContent></Card>
      </div>

      {/* Progress bar */}
      {recipients.length > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Send Progress</span>
            <span className="font-semibold">{Math.round((sentRecipients.length / recipients.length) * 100)}%</span>
          </div>
          <Progress value={(sentRecipients.length / recipients.length) * 100} className="h-2" />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs"><Mail className="h-3 w-3 mr-1" />Email Content</TabsTrigger>
          <TabsTrigger value="recipients" className="text-xs"><Users className="h-3 w-3 mr-1" />Recipients ({recipients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {campaign.campaign_type === "single" && template && (
            <EmailPreview html={template.body_html || ""} subject={template.subject} previewText={template.preview_text || undefined} />
          )}
          {campaign.campaign_type === "single" && !template && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No template linked. Edit this campaign to add one.</CardContent></Card>
          )}
          {campaign.campaign_type === "sequence" && sequences.length > 0 && (
            <div className="space-y-3">
              {sequences.map((s: any, i: number) => {
                const isOpen = expandedSequence === s.id;
                return (
                  <Card key={s.id} className={`transition-colors ${isOpen ? "border-primary/40" : ""}`}>
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedSequence(isOpen ? null : s.id)}
                    >
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">Step {s.step_number}</Badge>
                      {i > 0 && <span className="text-[10px] text-muted-foreground">+{s.delay_days}d</span>}
                      <span className="text-sm font-medium truncate flex-1">{s.subject_override || "No subject"}</span>
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t">
                        <EmailPreview html={s.body_html_override || ""} subject={s.subject_override || ""} className="mt-3" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          {campaign.campaign_type === "sequence" && sequences.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No sequence steps yet. Edit this campaign to add emails.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="recipients" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recipients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No recipients added yet.</p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Source</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Sent</TableHead>
                        {campaign.campaign_type === "sequence" && <TableHead className="text-xs">Step</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-medium">{r.name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[9px]">{r.source === "customer" ? "CRM" : r.source === "csv_import" ? "CSV" : "Manual"}</Badge></TableCell>
                          <TableCell><Badge className={`${RECIPIENT_STATUS_COLORS[r.status] || "bg-muted"} border-0 text-[10px]`}>{r.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : "—"}</TableCell>
                          {campaign.campaign_type === "sequence" && <TableCell className="text-xs">{r.current_step || 0}/{sequences.length}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule info */}
      {campaign.auto_schedule && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">Auto-Scheduling Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sending up to {campaign.max_sends_per_day} emails/day between {campaign.business_hours_start}:00–{campaign.business_hours_end}:00,
              {" "}{campaign.business_days?.join(", ") || "Mon–Fri"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Recipients Dialog */}
      <Dialog open={showAddRecipients} onOpenChange={v => { if (!v) { setShowAddRecipients(false); setNewRecipients([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Recipients to "{campaign.name}"</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-2">
            <CampaignRecipients
              recipients={newRecipients}
              onChange={setNewRecipients}
              campaignId={campaign.id}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddRecipients(false); setNewRecipients([]); }}>Cancel</Button>
            <Button
              className="gradient-brand text-primary-foreground"
              onClick={() => addRecipientsMut.mutate(newRecipients)}
              disabled={newRecipients.length === 0 || addRecipientsMut.isPending}
            >
              {addRecipientsMut.isPending ? "Adding..." : `Add ${newRecipients.length} Recipient(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
