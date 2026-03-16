import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Plus, Send, Clock, FileText, Eye, Pencil, Users, BarChart3,
  Search, Trash2, Copy, Pause, Play, ArrowLeft,
  MousePointerClick, UserMinus, AlertTriangle, Check, X, Sparkles, Layers
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AICampaignCreator } from "@/components/AICampaignCreator";
import {
  CAMPAIGN_STATUS_CONFIG, TEMPLATE_CATEGORY_CONFIG,
  type CampaignStatus, type CampaignStats,
} from "@/lib/types";

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  segment_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: any;
  created_at: string;
  updated_at: string;
}

interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  body_html: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  rules: any;
  estimated_count: number;
  color: string | null;
}

const Campaigns_Page = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<CampaignRow> | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateRow> | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [showAICreator, setShowAICreator] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignRow[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["email_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as TemplateRow[];
    },
  });

  const { data: segments = [] } = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("segments").select("*").order("name");
      if (error) throw error;
      return data as SegmentRow[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["email_templates"] });
  };

  /* Campaign mutations */
  const saveCampaignMut = useMutation({
    mutationFn: async (c: Partial<CampaignRow>) => {
      if (c.id) {
        const { error } = await supabase.from("campaigns").update({ name: c.name, template_id: c.template_id, segment_id: c.segment_id, scheduled_at: c.scheduled_at }).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campaigns").insert({ name: c.name!, status: "draft", template_id: c.template_id!, segment_id: c.segment_id!, scheduled_at: c.scheduled_at });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setShowBuilder(false); setEditingCampaign(null); toast({ title: "Campaign saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCampaignMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { invalidateAll(); setDeletingCampaignId(null); if (selectedCampaign) setSelectedCampaign(null); toast({ title: "Campaign deleted" }); },
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, scheduled_at }: { id: string; status: string; scheduled_at?: string }) => {
      const upd: any = { status };
      if (scheduled_at) upd.scheduled_at = scheduled_at;
      const { error } = await supabase.from("campaigns").update(upd).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); },
  });

  /* Template mutations */
  const saveTemplateMut = useMutation({
    mutationFn: async (t: Partial<TemplateRow>) => {
      if (t.id) {
        const { error } = await supabase.from("email_templates").update({ name: t.name, subject: t.subject, preview_text: t.preview_text, body_html: t.body_html, category: t.category }).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({ name: t.name!, subject: t.subject!, preview_text: t.preview_text, body_html: t.body_html, category: t.category || "welcome" });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setShowTemplateEditor(false); setEditingTemplate(null); toast({ title: "Template saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("email_templates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { invalidateAll(); setDeletingTemplateId(null); toast({ title: "Template deleted" }); },
  });

  /* Helpers */
  const getTemplate = (id: string | null) => templates.find(t => t.id === id);
  const getSegment = (id: string | null) => segments.find(s => s.id === id);
  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTemplates = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()));
  const totalSent = campaigns.reduce((sum, c) => sum + ((c.stats as any)?.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + ((c.stats as any)?.opened || 0), 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + ((c.stats as any)?.clicked || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  const handleSchedule = (campaign: CampaignRow) => {
    const scheduled = new Date(Date.now() + 86400000).toISOString();
    updateStatusMut.mutate({ id: campaign.id, status: "scheduled", scheduled_at: scheduled });
    if (selectedCampaign?.id === campaign.id) setSelectedCampaign({ ...campaign, status: "scheduled", scheduled_at: scheduled });
    toast({ title: "Campaign scheduled", description: "Will send tomorrow." });
  };

  const handleDuplicate = async (campaign: CampaignRow) => {
    const { error } = await supabase.from("campaigns").insert({
      name: `${campaign.name} (Copy)`, status: "draft", template_id: campaign.template_id, segment_id: campaign.segment_id,
    });
    if (!error) { invalidateAll(); toast({ title: "Campaign duplicated" }); }
  };

  const handleAIAccept = async (result: any) => {
    const { data: tpl } = await supabase.from("email_templates").insert({
      name: result.campaignName, subject: result.subject, preview_text: result.previewText, body_html: result.bodyHtml, category: result.category,
    }).select().single();
    if (!tpl) return;
    const matchSeg = segments.find(s => s.name.toLowerCase().includes(result.suggestedSegment.toLowerCase()));
    await supabase.from("campaigns").insert({
      name: result.campaignName, status: "draft", template_id: tpl.id, segment_id: matchSeg?.id || segments[0]?.id,
    });
    invalidateAll();
    toast({ title: "AI campaign created!" });
  };

  /* Campaign detail view */
  if (selectedCampaign) {
    const tpl = getTemplate(selectedCampaign.template_id);
    const seg = getSegment(selectedCampaign.segment_id);
    const cfg = CAMPAIGN_STATUS_CONFIG[selectedCampaign.status as CampaignStatus] || CAMPAIGN_STATUS_CONFIG.draft;
    const stats = selectedCampaign.stats as CampaignStats | null;

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-foreground">{selectedCampaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${cfg.bgColor} ${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
              {seg && <span className="text-xs text-muted-foreground">→ {seg.name} ({seg.estimated_count} recipients)</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {selectedCampaign.status === "draft" && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditingCampaign(selectedCampaign); setShowBuilder(true); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                <Button size="sm" className="gradient-brand text-primary-foreground" onClick={() => handleSchedule(selectedCampaign)}><Clock className="h-3.5 w-3.5 mr-1" /> Schedule</Button>
              </>
            )}
            {selectedCampaign.status === "scheduled" && (
              <Button variant="outline" size="sm" onClick={() => { updateStatusMut.mutate({ id: selectedCampaign.id, status: "paused" }); setSelectedCampaign({ ...selectedCampaign, status: "paused" }); }}><Pause className="h-3.5 w-3.5 mr-1" /> Pause</Button>
            )}
            {selectedCampaign.status === "paused" && (
              <Button size="sm" className="gradient-brand text-primary-foreground" onClick={() => handleSchedule(selectedCampaign)}><Play className="h-3.5 w-3.5 mr-1" /> Resume</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Template</CardDescription><CardTitle className="text-base">{tpl?.name || "Unknown"}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground truncate">{tpl?.subject}</p>{tpl && <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setPreviewTemplate(tpl)}><Eye className="h-3 w-3 mr-1" /> Preview</Button>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Segment</CardDescription><CardTitle className="text-base">{seg?.name || "Unknown"}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{seg?.description}</p><p className="text-sm font-semibold mt-1">{seg?.estimated_count} recipients</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Schedule</CardDescription><CardTitle className="text-base">{selectedCampaign.sent_at ? `Sent ${new Date(selectedCampaign.sent_at).toLocaleDateString()}` : selectedCampaign.scheduled_at ? `Scheduled ${new Date(selectedCampaign.scheduled_at).toLocaleDateString()}` : "Not scheduled"}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Created {new Date(selectedCampaign.created_at).toLocaleDateString()}</p></CardContent></Card>
        </div>

        {stats && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: "Sent", value: stats.sent, icon: Send, color: "text-foreground" },
                  { label: "Delivered", value: stats.delivered, icon: Check, color: "text-status-resolved" },
                  { label: "Opened", value: stats.opened, icon: Eye, color: "text-primary" },
                  { label: "Clicked", value: stats.clicked, icon: MousePointerClick, color: "text-category-scheduling" },
                  { label: "Bounced", value: stats.bounced, icon: AlertTriangle, color: "text-status-pending" },
                  { label: "Unsubs", value: stats.unsubscribed, icon: UserMinus, color: "text-destructive" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                    <p className="text-lg font-bold font-heading">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-6">
                <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Open Rate</span><span className="font-semibold">{Math.round((stats.opened / stats.sent) * 100)}%</span></div><Progress value={(stats.opened / stats.sent) * 100} className="h-2" /></div>
                <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Click Rate</span><span className="font-semibold">{Math.round((stats.clicked / stats.sent) * 100)}%</span></div><Progress value={(stats.clicked / stats.sent) * 100} className="h-2" /></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  /* Main view */
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Build single or multi-step email sequences, segment, and track</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingTemplate({ name: "", subject: "", preview_text: "", body_html: "", category: "welcome" }); setShowTemplateEditor(true); }}><FileText className="h-3.5 w-3.5 mr-1" /> New Template</Button>
          <Button variant="outline" size="sm" onClick={() => setShowAICreator(true)}><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Creator</Button>
          <Button size="sm" className="gradient-brand text-primary-foreground shadow-glow" onClick={() => { setEditingCampaign({ name: "", status: "draft", template_id: "", segment_id: "" }); setShowBuilder(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> New Campaign</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Mail },
          { label: "Emails Sent", value: totalSent.toLocaleString(), icon: Send },
          { label: "Avg Open Rate", value: `${avgOpenRate}%`, icon: Eye },
          { label: "Avg Click Rate", value: `${avgClickRate}%`, icon: MousePointerClick },
        ].map(s => (
          <Card key={s.label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2.5"><s.icon className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold font-heading">{s.value}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {filteredCampaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No campaigns yet. Create one to get started.</CardContent></Card>
          ) : filteredCampaigns.map(campaign => {
            const tpl = getTemplate(campaign.template_id);
            const seg = getSegment(campaign.segment_id);
            const cfg = CAMPAIGN_STATUS_CONFIG[campaign.status as CampaignStatus] || CAMPAIGN_STATUS_CONFIG.draft;
            return (
              <Card key={campaign.id} className="hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-lg p-2.5 ${cfg.bgColor}`}><Mail className={`h-4 w-4 ${cfg.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-heading font-semibold text-foreground truncate">{campaign.name}</h3>
                      <Badge className={`${cfg.bgColor} ${cfg.color} border-0 text-[10px]`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl?.name || "No template"} → {seg?.name || "No segment"}</p>
                  </div>
                  {(campaign.stats as any)?.sent && <div className="text-right shrink-0"><p className="text-sm font-bold font-heading">{(campaign.stats as any).sent}</p><p className="text-[10px] text-muted-foreground">sent</p></div>}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-3">
          {filteredTemplates.map(tpl => {
            const catCfg = TEMPLATE_CATEGORY_CONFIG[tpl.category];
            return (
              <Card key={tpl.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5"><FileText className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-heading font-semibold text-foreground truncate">{tpl.name}</h3>
                      {catCfg && <Badge variant="outline" className={`${catCfg.color} text-[10px]`}>{catCfg.label}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTemplate(tpl)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTemplate(tpl); setShowTemplateEditor(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingTemplateId(tpl.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="segments" className="mt-4 space-y-3">
          {segments.map(seg => (
            <Card key={seg.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-foreground">{seg.name}</h3>
                  <p className="text-xs text-muted-foreground">{seg.description}</p>
                </div>
                <div className="text-right"><p className="text-sm font-bold font-heading">{seg.estimated_count}</p><p className="text-[10px] text-muted-foreground">patients</p></div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Campaign builder */}
      <Dialog open={showBuilder} onOpenChange={v => { if (!v) { setShowBuilder(false); setEditingCampaign(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCampaign?.id ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-sm">Name</Label><Input value={editingCampaign?.name || ""} onChange={e => setEditingCampaign(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-sm">Template</Label>
              <Select value={editingCampaign?.template_id || ""} onValueChange={v => setEditingCampaign(p => ({ ...p, template_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm">Segment</Label>
              <Select value={editingCampaign?.segment_id || ""} onValueChange={v => setEditingCampaign(p => ({ ...p, segment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                <SelectContent>{segments.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.estimated_count})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBuilder(false); setEditingCampaign(null); }}>Cancel</Button>
            <Button className="gradient-brand text-primary-foreground" onClick={() => editingCampaign && saveCampaignMut.mutate(editingCampaign)} disabled={saveCampaignMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template editor */}
      <Dialog open={showTemplateEditor} onOpenChange={v => { if (!v) { setShowTemplateEditor(false); setEditingTemplate(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Name</Label><Input value={editingTemplate?.name || ""} onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label className="text-sm">Category</Label>
                <Select value={editingTemplate?.category || "welcome"} onValueChange={v => setEditingTemplate(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TEMPLATE_CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-sm">Subject Line</Label><Input value={editingTemplate?.subject || ""} onChange={e => setEditingTemplate(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label className="text-sm">Preview Text</Label><Input value={editingTemplate?.preview_text || ""} onChange={e => setEditingTemplate(p => ({ ...p, preview_text: e.target.value }))} /></div>
            <div><Label className="text-sm">Body HTML</Label><Textarea value={editingTemplate?.body_html || ""} onChange={e => setEditingTemplate(p => ({ ...p, body_html: e.target.value }))} className="min-h-[200px] font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTemplateEditor(false); setEditingTemplate(null); }}>Cancel</Button>
            <Button className="gradient-brand text-primary-foreground" onClick={() => editingTemplate && saveTemplateMut.mutate(editingTemplate)} disabled={saveTemplateMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template preview */}
      <Dialog open={!!previewTemplate} onOpenChange={v => !v && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Subject:</span> {previewTemplate?.subject}</p>
            <p><span className="text-muted-foreground">Preview:</span> {previewTemplate?.preview_text}</p>
            <Separator />
            <div className="rounded-lg border bg-card p-4" dangerouslySetInnerHTML={{ __html: previewTemplate?.body_html || "" }} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialogs */}
      <AlertDialog open={!!deletingCampaignId} onOpenChange={o => !o && setDeletingCampaignId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete campaign?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deletingCampaignId && deleteCampaignMut.mutate(deletingCampaignId)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingTemplateId} onOpenChange={o => !o && setDeletingTemplateId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deletingTemplateId && deleteTemplateMut.mutate(deletingTemplateId)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* AI Creator */}
      <AICampaignCreator
        open={showAICreator}
        onOpenChange={setShowAICreator}
        segments={segments.map(s => ({ id: s.id, name: s.name, description: s.description || "", rules: s.rules || [], estimatedCount: s.estimated_count, color: s.color || "primary" }))}
        onAccept={handleAIAccept}
      />
    </div>
  );
};

// Missing Label import
import { Label } from "@/components/ui/label";

export default Campaigns_Page;
