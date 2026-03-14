import { useState } from "react";
import {
  Mail, Plus, Send, Clock, FileText, Eye, Pencil, Users, BarChart3,
  Calendar, Search, ChevronRight, Trash2, Copy, Pause, Play, ArrowLeft,
  MousePointerClick, UserMinus, AlertTriangle, Check, X
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import {
  CAMPAIGNS, TEMPLATES, SEGMENTS, CAMPAIGN_STATUS_CONFIG, TEMPLATE_CATEGORY_CONFIG,
  type Campaign, type EmailTemplate, type Segment, type CampaignStatus
} from "@/lib/campaign-data";

const Campaigns_Page = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [templates, setTemplates] = useState<EmailTemplate[]>(TEMPLATES);
  const [segments] = useState<Segment[]>(SEGMENTS);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [search, setSearch] = useState("");

  // Campaign builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

  // Template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);

  // Detail view
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Preview
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Delete confirmation state
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  /* ── Campaign actions ── */
  const handleCreateCampaign = () => {
    setEditingCampaign({ name: "", status: "draft", templateId: "", segmentId: "", scheduledAt: null });
    setShowBuilder(true);
  };

  const handleSaveCampaign = () => {
    if (!editingCampaign?.name || !editingCampaign.templateId || !editingCampaign.segmentId) {
      toast({ title: "Missing fields", description: "Name, template, and segment are required.", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    if (editingCampaign.id) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? { ...c, ...editingCampaign, updatedAt: now } as Campaign : c));
      toast({ title: "Campaign updated" });
    } else {
      const newCampaign: Campaign = {
        id: `c${Date.now()}`,
        name: editingCampaign.name,
        status: "draft",
        templateId: editingCampaign.templateId,
        segmentId: editingCampaign.segmentId,
        scheduledAt: editingCampaign.scheduledAt || null,
        sentAt: null,
        stats: null,
        createdAt: now,
        updatedAt: now,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      toast({ title: "Campaign created" });
    }
    setShowBuilder(false);
    setEditingCampaign(null);
  };

  const handleScheduleCampaign = (campaign: Campaign) => {
    const scheduled = new Date(Date.now() + 86400000).toISOString();
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: "scheduled" as CampaignStatus, scheduledAt: scheduled, updatedAt: new Date().toISOString() } : c));
    if (selectedCampaign?.id === campaign.id) setSelectedCampaign({ ...campaign, status: "scheduled", scheduledAt: scheduled });
    toast({ title: "Campaign scheduled", description: "Will send tomorrow." });
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const dup: Campaign = {
      ...campaign,
      id: `c${Date.now()}`,
      name: `${campaign.name} (Copy)`,
      status: "draft",
      scheduledAt: null,
      sentAt: null,
      stats: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCampaigns(prev => [dup, ...prev]);
    toast({ title: "Campaign duplicated" });
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
    setDeletingCampaignId(null);
    toast({ title: "Campaign deleted" });
  };

  /* ── Template actions ── */
  const handleCreateTemplate = () => {
    setEditingTemplate({ name: "", subject: "", previewText: "", bodyHtml: "", category: "welcome" });
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate?.name || !editingTemplate.subject) {
      toast({ title: "Missing fields", description: "Name and subject are required.", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    if (editingTemplate.id) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...editingTemplate, updatedAt: now } as EmailTemplate : t));
      toast({ title: "Template updated" });
    } else {
      const newT: EmailTemplate = {
        id: `t${Date.now()}`,
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        previewText: editingTemplate.previewText || "",
        bodyHtml: editingTemplate.bodyHtml || "",
        category: editingTemplate.category as EmailTemplate["category"] || "welcome",
        createdAt: now,
        updatedAt: now,
      };
      setTemplates(prev => [newT, ...prev]);
      toast({ title: "Template created" });
    }
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setDeletingTemplateId(null);
    toast({ title: "Template deleted" });
  };

  /* ── Helpers ── */
  const getTemplate = (id: string) => templates.find(t => t.id === id);
  const getSegment = (id: string) => segments.find(s => s.id === id);

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + (c.stats?.clicked || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  /* ── Campaign detail view ── */
  if (selectedCampaign) {
    const tpl = getTemplate(selectedCampaign.templateId);
    const seg = getSegment(selectedCampaign.segmentId);
    const cfg = CAMPAIGN_STATUS_CONFIG[selectedCampaign.status];
    const stats = selectedCampaign.stats;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-foreground">{selectedCampaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${cfg.bgColor} ${cfg.color} border-0 text-xs`}>{cfg.label}</Badge>
              {seg && <span className="text-xs text-muted-foreground">→ {seg.name} ({seg.estimatedCount} recipients)</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {selectedCampaign.status === "draft" && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditingCampaign(selectedCampaign); setShowBuilder(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" className="gradient-brand text-primary-foreground" onClick={() => handleScheduleCampaign(selectedCampaign)}>
                  <Clock className="h-3.5 w-3.5 mr-1" /> Schedule
                </Button>
              </>
            )}
            {selectedCampaign.status === "scheduled" && (
              <Button variant="outline" size="sm" onClick={() => {
                setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, status: "paused" as CampaignStatus } : c));
                setSelectedCampaign({ ...selectedCampaign, status: "paused" });
              }}>
                <Pause className="h-3.5 w-3.5 mr-1" /> Pause
              </Button>
            )}
            {selectedCampaign.status === "paused" && (
              <Button size="sm" className="gradient-brand text-primary-foreground" onClick={() => handleScheduleCampaign(selectedCampaign)}>
                <Play className="h-3.5 w-3.5 mr-1" /> Resume
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Template</CardDescription>
              <CardTitle className="text-base">{tpl?.name || "Unknown"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground truncate">{tpl?.subject}</p>
              {tpl && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setPreviewTemplate(tpl)}>
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Segment</CardDescription>
              <CardTitle className="text-base">{seg?.name || "Unknown"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{seg?.description}</p>
              <p className="text-sm font-semibold mt-1">{seg?.estimatedCount} recipients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Schedule</CardDescription>
              <CardTitle className="text-base">
                {selectedCampaign.sentAt
                  ? `Sent ${new Date(selectedCampaign.sentAt).toLocaleDateString()}`
                  : selectedCampaign.scheduledAt
                    ? `Scheduled ${new Date(selectedCampaign.scheduledAt).toLocaleDateString()}`
                    : "Not scheduled"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Created {new Date(selectedCampaign.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Performance</CardTitle>
            </CardHeader>
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
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Open Rate</span>
                    <span className="font-semibold">{Math.round((stats.opened / stats.sent) * 100)}%</span>
                  </div>
                  <Progress value={(stats.opened / stats.sent) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Click Rate</span>
                    <span className="font-semibold">{Math.round((stats.clicked / stats.sent) * 100)}%</span>
                  </div>
                  <Progress value={(stats.clicked / stats.sent) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  /* ── Main view ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Build, segment, schedule, and track email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateTemplate}>
            <FileText className="h-3.5 w-3.5 mr-1" /> New Template
          </Button>
          <Button size="sm" className="gradient-brand text-primary-foreground shadow-glow" onClick={handleCreateCampaign}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Mail },
          { label: "Emails Sent", value: totalSent.toLocaleString(), icon: Send },
          { label: "Avg Open Rate", value: `${avgOpenRate}%`, icon: Eye },
          { label: "Avg Click Rate", value: `${avgClickRate}%`, icon: MousePointerClick },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold font-heading">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
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

        {/* ── Campaigns tab ── */}
        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {filteredCampaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No campaigns yet. Create one to get started.</CardContent></Card>
          ) : filteredCampaigns.map(campaign => {
            const tpl = getTemplate(campaign.templateId);
            const seg = getSegment(campaign.segmentId);
            const cfg = CAMPAIGN_STATUS_CONFIG[campaign.status];
            return (
              <Card key={campaign.id} className="hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-lg p-2.5 ${cfg.bgColor}`}>
                    <Mail className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-sm font-semibold truncate">{campaign.name}</h3>
                      <Badge className={`${cfg.bgColor} ${cfg.color} border-0 text-[10px]`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tpl?.name || "No template"} → {seg?.name || "No segment"} ({seg?.estimatedCount || 0})
                    </p>
                  </div>
                  {campaign.stats && (
                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{campaign.stats.sent} sent</span>
                      <span>{Math.round((campaign.stats.opened / campaign.stats.sent) * 100)}% opened</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicateCampaign(campaign)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingCampaignId(campaign.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Templates tab ── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const cat = TEMPLATE_CATEGORY_CONFIG[template.category];
              return (
                <Card key={template.id} className="hover:shadow-elevated transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`${cat.color} text-[10px]`}>{cat.label}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTemplate(template); setShowTemplateEditor(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingTemplateId(template.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <CardDescription className="text-xs truncate">{template.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground truncate">{template.previewText}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Segments tab ── */}
        <TabsContent value="segments" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map(segment => (
              <Card key={segment.id} className="hover:shadow-elevated transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold font-heading">{segment.estimatedCount}</span>
                  </div>
                  <CardTitle className="text-sm">{segment.name}</CardTitle>
                  <CardDescription className="text-xs">{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {segment.rules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                        <span className="font-medium">{rule.field}</span>
                        <span className="text-muted-foreground/60">{rule.operator.replace("_", " ")}</span>
                        <span className="font-mono text-foreground">{rule.value.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Campaign builder dialog ── */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCampaign?.id ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Campaign Name</label>
              <Input className="mt-1" placeholder="e.g., March Newsletter" value={editingCampaign?.name || ""} onChange={e => setEditingCampaign(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email Template</label>
              <Select value={editingCampaign?.templateId || ""} onValueChange={v => setEditingCampaign(prev => prev ? { ...prev, templateId: v } : prev)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Audience Segment</label>
              <Select value={editingCampaign?.segmentId || ""} onValueChange={v => setEditingCampaign(prev => prev ? { ...prev, segmentId: v } : prev)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a segment" /></SelectTrigger>
                <SelectContent>
                  {segments.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.estimatedCount} recipients)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
            <Button className="gradient-brand text-primary-foreground" onClick={handleSaveCampaign}>
              {editingCampaign?.id ? "Save Changes" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Template editor dialog ── */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Template Name</label>
                <Input className="mt-1" placeholder="e.g., Welcome Email" value={editingTemplate?.name || ""} onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : prev)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select value={editingTemplate?.category || "welcome"} onValueChange={v => setEditingTemplate(prev => prev ? { ...prev, category: v as EmailTemplate["category"] } : prev)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Subject Line</label>
              <Input className="mt-1" placeholder="Email subject" value={editingTemplate?.subject || ""} onChange={e => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : prev)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preview Text</label>
              <Input className="mt-1" placeholder="Short preview shown in inbox" value={editingTemplate?.previewText || ""} onChange={e => setEditingTemplate(prev => prev ? { ...prev, previewText: e.target.value } : prev)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email Body (HTML)</label>
              <Textarea className="mt-1 font-mono text-xs min-h-[200px]" placeholder="<div>Your email content...</div>" value={editingTemplate?.bodyHtml || ""} onChange={e => setEditingTemplate(prev => prev ? { ...prev, bodyHtml: e.target.value } : prev)} />
              <p className="text-[10px] text-muted-foreground/60 mt-1">Use {"{{variable}}"} for merge tags: {"{{first_name}}"}, {"{{booking_link}}"}, etc.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>Cancel</Button>
            {editingTemplate?.bodyHtml && (
              <Button variant="outline" onClick={() => setPreviewTemplate(editingTemplate as EmailTemplate)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> Preview
              </Button>
            )}
            <Button className="gradient-brand text-primary-foreground" onClick={handleSaveTemplate}>
              {editingTemplate?.id ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Template preview dialog ── */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Email Preview
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs"><span className="text-muted-foreground">From:</span> <span className="font-medium">FitLogic &lt;hello@fitlogic.com&gt;</span></p>
                <p className="text-xs"><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{previewTemplate.subject}</span></p>
                <p className="text-xs"><span className="text-muted-foreground">Preview:</span> <span className="text-muted-foreground">{previewTemplate.previewText}</span></p>
              </div>
              <div className="border rounded-lg p-6 bg-card" dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete campaign confirmation */}
      <AlertDialog open={!!deletingCampaignId} onOpenChange={(open) => !open && setDeletingCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the campaign and its data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingCampaignId && handleDeleteCampaign(deletingCampaignId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete template confirmation */}
      <AlertDialog open={!!deletingTemplateId} onOpenChange={(open) => !open && setDeletingTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the email template. Campaigns using it will need a new template.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingTemplateId && handleDeleteTemplate(deletingTemplateId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaigns_Page;
