"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Mail, TrendingUp, ArrowRight,
  Share2, Plus, GripVertical, Target, ChevronDown, Maximize2, X, Search, ArrowRightLeft,
  Loader2, DollarSign, Calendar, Building2, ChevronsDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Pipeline stage config — order matters for kanban columns
const PIPELINE_STAGES = [
  { key: "new_lead",     label: "New Lead",     color: "bg-slate-100 text-slate-700 border-slate-200",     dot: "bg-slate-400",    accent: "bg-slate-400",    accentLight: "bg-slate-400/10" },
  { key: "contacted",    label: "Contacted",    color: "bg-blue-100 text-blue-700 border-blue-200",         dot: "bg-blue-400",     accent: "bg-blue-400",     accentLight: "bg-blue-400/10" },
  { key: "qualified",    label: "Qualified",    color: "bg-violet-100 text-violet-700 border-violet-200",   dot: "bg-violet-400",   accent: "bg-violet-500",   accentLight: "bg-violet-500/10" },
  { key: "proposal",     label: "Proposal",     color: "bg-amber-100 text-amber-700 border-amber-200",      dot: "bg-amber-400",    accent: "bg-amber-400",    accentLight: "bg-amber-400/10" },
  { key: "negotiation",  label: "Negotiation",  color: "bg-orange-100 text-orange-700 border-orange-200",   dot: "bg-orange-500",   accent: "bg-orange-500",   accentLight: "bg-orange-500/10" },
  { key: "won",          label: "Won",          color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500",  accent: "bg-emerald-500",  accentLight: "bg-emerald-500/10" },
  { key: "lost",         label: "Lost",         color: "bg-red-100 text-red-700 border-red-200",            dot: "bg-red-400",      accent: "bg-red-400",      accentLight: "bg-red-400/10" },
] as const;

type PipelineStage = typeof PIPELINE_STAGES[number]["key"];

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  pipeline_stage: string | null;
  created_at: string;
  company: string | null;
  deal_value: number | null;
  lead_source: string | null;
  last_contacted_at: string | null;
};

function fmt$(v: number | null) {
  if (v == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function relDate(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function initials(f: string, l: string) {
  return `${f[0] || ""}${l[0] || ""}`.toUpperCase();
}

// ─── Kanban Card ───────────────────────────────────────────────────────────────
function PipelineCard({
  contact,
  onDragStart,
  onNavigate,
  isDragging,
}: {
  contact: ContactRow;
  onDragStart: (id: string) => void;
  onNavigate: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(contact.id); }}
      className={`bg-card border rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all group select-none ${
        isDragging
          ? "opacity-40 scale-95 border-primary shadow-lg ring-1 ring-primary/30"
          : "border-border shadow-sm hover:shadow-md hover:border-border/80"
      }`}
      onClick={onNavigate}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {contact.first_name} {contact.last_name}
        </p>
        {contact.email && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{contact.email}</p>
        )}
      </div>
      <div className="flex items-center justify-end mt-3">
        <span className="text-[10px] text-muted-foreground/70">{relDate(contact.created_at)}</span>
      </div>
    </div>
  );
}

const COLLAPSED_LIMIT = 4;

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  contacts,
  draggingId,
  onDragStart,
  onDrop,
  onNavigate,
  onAddContact,
  onExpand,
}: {
  stage: typeof PIPELINE_STAGES[number];
  contacts: ContactRow[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDrop: (stage: string) => void;
  onNavigate: (id: string) => void;
  onAddContact: (stage: string) => void;
  onExpand: (stage: typeof PIPELINE_STAGES[number], contacts: ContactRow[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const overflow = contacts.length > COLLAPSED_LIMIT;
  const visible = contacts.slice(0, COLLAPSED_LIMIT);
  const hidden = contacts.length - COLLAPSED_LIMIT;

  return (
    <div
      className={`flex flex-col rounded-xl border transition-all ${
        dragOver
          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-lg"
          : "border-border bg-card shadow-sm"
      }`}
      style={{ minWidth: 240, width: 240 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={() => { setDragOver(false); onDrop(stage.key); }}
    >
      {/* Colour accent strip */}
      <div className={`h-1 rounded-t-xl ${stage.accent}`} />

      {/* Column header */}
      <div className={`px-3 pt-3 pb-2.5 ${stage.accentLight} rounded-none border-b border-border/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground tracking-wide">{stage.label}</span>
            <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold border ${
              contacts.length >= 10
                ? "bg-amber-500/15 text-amber-600 border-amber-400/30"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {contacts.length}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {contacts.length > 0 && (
              <button
                onClick={() => onExpand(stage, contacts)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title={`View all ${stage.label}`}
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onAddContact(stage.key)}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title={`Add to ${stage.label}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Density bar */}
        {contacts.length > 0 && (
          <div className="mt-2 h-1 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                contacts.length >= 15 ? "bg-red-500" :
                contacts.length >= 10 ? "bg-amber-500" :
                contacts.length >= 5  ? "bg-blue-400" :
                "bg-emerald-400"
              }`}
              style={{ width: `${Math.min((contacts.length / 15) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Cards area */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto" style={{ maxHeight: 520 }}>
        {visible.map((c) => (
          <PipelineCard
            key={c.id}
            contact={c}
            isDragging={draggingId === c.id}
            onDragStart={onDragStart}
            onNavigate={() => onNavigate(c.id)}
          />
        ))}

        {contacts.length === 0 && (
          <button
            onClick={() => onAddContact(stage.key)}
            className="w-full flex flex-col items-center justify-center h-20 text-[11px] text-muted-foreground/40 rounded-lg border border-dashed border-border/50 hover:border-primary/40 hover:text-primary/60 hover:bg-primary/5 transition-colors gap-1.5 mt-1"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        )}

        {/* Show more → opens the full stage sheet */}
        {overflow && (
          <button
            onClick={() => onExpand(stage, contacts)}
            className="w-full flex items-center justify-center gap-1 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors border border-dashed border-border/40"
          >
            <ChevronDown className="h-3 w-3" /> {hidden} more
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stage Detail Sheet (expanded format) ──────────────────────────────────────
function StageSheet({
  stage,
  contacts,
  onClose,
  onNavigate,
  onDragStart,
  onDrop,
  onTransfer,
  draggingId,
  onLoadMore,
  hasMore,
  loadingMore,
  totalContactCount,
  loadedCount,
}: {
  stage: typeof PIPELINE_STAGES[number] | null;
  contacts: ContactRow[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (stageKey: string) => void;
  onTransfer: (contactId: string, toStage: string) => void;
  draggingId: string | null;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  totalContactCount: number;
  loadedCount: number;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "deal_high" | "deal_low">("newest");
  const [dragOver, setDragOver] = useState(false);

  // Reset search/sort when switching stages
  useEffect(() => {
    if (stage) { setSearch(""); setSortBy("newest"); }
  }, [stage?.key]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = contacts.filter((c) => {
      if (!q) return true;
      return (
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
      );
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case "deal_high":
          return (b.deal_value ?? 0) - (a.deal_value ?? 0);
        case "deal_low":
          return (a.deal_value ?? 0) - (b.deal_value ?? 0);
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return sorted;
  }, [contacts, search, sortBy]);

  const totalDealValue = useMemo(
    () => contacts.reduce((s, c) => s + (c.deal_value ?? 0), 0),
    [contacts],
  );
  const avgDealValue = contacts.length > 0 ? totalDealValue / contacts.length : 0;
  const withDealValue = contacts.filter((c) => (c.deal_value ?? 0) > 0).length;

  return (
    <Sheet open={!!stage} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[560px] p-0 flex flex-col">
        {/* Coloured banner */}
        {stage && <div className={`h-1.5 ${stage.accent} shrink-0`} />}

        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {stage && <span className={`h-3 w-3 rounded-full shrink-0 ${stage.dot}`} />}
              <SheetTitle className="text-lg font-heading">{stage?.label}</SheetTitle>
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 border font-semibold">
                {contacts.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-muted transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                <Users className="h-3 w-3" /> Contacts
              </div>
              <p className="text-lg font-bold font-heading text-foreground mt-0.5">{contacts.length}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                <DollarSign className="h-3 w-3" /> Pipeline
              </div>
              <p className="text-lg font-bold font-heading text-foreground mt-0.5 truncate">
                {fmt$(totalDealValue) ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                <TrendingUp className="h-3 w-3" /> Avg deal
              </div>
              <p className="text-lg font-bold font-heading text-foreground mt-0.5 truncate">
                {withDealValue > 0 ? fmt$(avgDealValue) : "—"}
              </p>
            </div>
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by name, email, or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="newest" className="text-xs">Newest first</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest first</SelectItem>
                <SelectItem value="name" className="text-xs">Name A–Z</SelectItem>
                <SelectItem value="deal_high" className="text-xs">Deal $ high</SelectItem>
                <SelectItem value="deal_low" className="text-xs">Deal $ low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Body */}
        <div
          className={`flex-1 overflow-hidden transition-colors ${dragOver ? "bg-primary/5" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
          onDrop={() => { setDragOver(false); stage && onDrop(stage.key); }}
        >
          <ScrollArea className="h-full">
            <div className="p-5 space-y-2.5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">
                    {search ? `No contacts match "${search}"` : "No contacts in this stage"}
                  </p>
                  {!search && hasMore && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Load more contacts below to keep looking.
                    </p>
                  )}
                </div>
              ) : (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => onDragStart(c.id)}
                    onClick={() => onNavigate(c.id)}
                    className={`group relative rounded-xl border bg-card px-4 py-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 transition-all ${
                      draggingId === c.id ? "opacity-50 scale-95 border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {initials(c.first_name, c.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {c.first_name} {c.last_name}
                          </p>
                          {c.deal_value != null && c.deal_value > 0 && (
                            <span className="text-xs font-bold text-emerald-600 shrink-0">
                              {fmt$(c.deal_value)}
                            </span>
                          )}
                        </div>
                        {c.email && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.email}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {c.company && (
                            <span className="flex items-center gap-1 truncate min-w-0">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{c.company}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="h-3 w-3" />
                            {relDate(c.created_at)}
                          </span>
                          {c.lead_source && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">
                              {c.lead_source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Action row */}
                    <div
                      className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select value="" onValueChange={(toStage) => onTransfer(c.id, toStage)}>
                        <SelectTrigger className="h-7 text-[11px] w-auto px-2 gap-1.5 border-muted">
                          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                          <span>Move</span>
                        </SelectTrigger>
                        <SelectContent align="end">
                          <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Transfer to stage</p>
                          {PIPELINE_STAGES.filter((s) => s.key !== stage?.key).map((s) => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">
                              <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${s.dot}`} />
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2.5"
                        onClick={() => onNavigate(c.id)}
                      >
                        View profile
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {/* Prominent in-sheet Load more — surfaces when the user might be
                  missing contacts that haven't been fetched yet. */}
              {hasMore && (
                <div className="pt-3">
                  <Button
                    size="lg"
                    variant="default"
                    className="w-full h-12 text-sm font-semibold gap-2 shadow-sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more contacts…
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-4 w-4" />
                        Load more contacts
                        {totalContactCount > 0 && (
                          <span className="text-xs font-normal opacity-80">
                            ({loadedCount.toLocaleString()} of {totalContactCount.toLocaleString()})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    More contacts may belong to this stage — load the rest to see them.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {dragOver && (
          <div className="px-5 py-2 border-t text-xs text-primary font-medium text-center bg-primary/5 shrink-0">
            Drop here to move to {stage?.label}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const Index = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pipeline" | "summary">("pipeline");
  const [addContactStage, setAddContactStage] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<typeof PIPELINE_STAGES[number] | null>(null);

  // Paginated loading — Supabase PostgREST silently caps un-ranged queries at
  // ~1000 rows, which was hiding contacts past that threshold from the
  // pipeline. Fetch in 500-row batches and accumulate.
  const PIPELINE_PAGE_SIZE = 500;
  const [pipelinePage, setPipelinePage] = useState(0);
  const [pipelineAllLoaded, setPipelineAllLoaded] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  const { data: pageData, isLoading: pageLoading, isFetching: pageFetching } = useQuery({
    queryKey: [...QK.patients, "pipeline", pipelinePage],
    queryFn: async () => {
      const from = pipelinePage * PIPELINE_PAGE_SIZE;
      const to = from + PIPELINE_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("patients")
        .select(
          "id, first_name, last_name, email, status, pipeline_stage, created_at, company, deal_value, lead_source, last_contacted_at",
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return ((data ?? []) as unknown) as ContactRow[];
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!pageData) return;
    if (pageData.length < PIPELINE_PAGE_SIZE) setPipelineAllLoaded(true);
    setContacts((prev) => {
      if (pipelinePage === 0) return pageData;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...pageData.filter((p) => !seen.has(p.id))];
    });
  }, [pageData, pipelinePage]);

  // Show the page-0 skeleton only on the first load, never on subsequent
  // "Load more" fetches (otherwise the whole board flickers each batch).
  const contactsLoading = pageLoading && contacts.length === 0;
  const loadingMore = pageFetching && contacts.length > 0;

  // Total count for the "Loaded X of Y" indicator.
  const { data: totalContactCount = 0 } = useQuery({
    queryKey: [...QK.patients, "pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const loadMorePipeline = () => {
    if (pipelineAllLoaded || pageFetching) return;
    setPipelinePage((p) => p + 1);
  };

  const { data: campaigns = [] } = useQuery({
    queryKey: QK.campaigns,
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, status, sent_count, recipient_count, stats, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: QK.referrals,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals").select("id, status").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: QK.intakeSubmissions,
    queryFn: async () => {
      const { data } = await supabase
        .from("intake_submissions")
        .select("id, review_status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Move contact to a new pipeline stage. The kanban used to write to
  // patients.status, which is the account status (active/inactive/archived) and
  // a separate column from pipeline_stage. The bug surfaced as "I dragged the
  // card to Won but the contact record still shows the old stage" because the
  // contact view reads pipeline_stage, not status. Writing to pipeline_stage
  // makes both views agree.
  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("patients")
        .update({ pipeline_stage: stage } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK.patients }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to move contact"),
  });

  const [pickerSearch, setPickerSearch] = useState("");

  const moveToStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("patients")
        .update({ pipeline_stage: stage } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.patients });
      setAddContactStage(null);
      setPickerSearch("");
      toast.success("Contact moved to stage");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to move contact"),
  });

  // Normalise legacy status values to a pipeline stage key
  const STAGE_KEYS = new Set(PIPELINE_STAGES.map((s) => s.key));
  const toStage = (status: string): PipelineStage => {
    if (STAGE_KEYS.has(status as PipelineStage)) return status as PipelineStage;
    return "new_lead"; // catch-all: all legacy / unknown values land in New Lead
  };

  const handleDrop = (targetStage: string) => {
    if (!draggingId || !targetStage) return;
    const contact = contacts.find((c) => c.id === draggingId);
    if (!contact || toStage(contact.pipeline_stage ?? "") === targetStage) { setDraggingId(null); return; }
    stageMutation.mutate({ id: draggingId, stage: targetStage });
    setDraggingId(null);
  };

  // Group contacts by stage — every contact lands in exactly one column
  const byStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.key, contacts.filter((c) => toStage(c.pipeline_stage ?? "") === s.key)])
  ) as Record<PipelineStage, ContactRow[]>;

  // KPIs
  const activeContacts   = contacts.filter((c) => c.status === "active").length;
  const activeCampaigns  = campaigns.filter((c) => c.status === "active" || c.status === "scheduled").length;
  const totalSent        = campaigns.reduce((s, c) => s + ((c as any).sent_count || 0), 0);
  const pendingLeads     = (submissions as any[]).filter((s) => s.review_status === "pending").length;
  const convertedReferrals = referrals.filter((r: any) => r.status === "converted").length;
  const pipelineContacts = contacts.length;
  const wonCount         = byStage.won?.length ?? 0;
  const lostCount        = byStage.lost?.length ?? 0;
  const totalDeals       = wonCount + lostCount;
  const conversionRate   = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;

  const recentCampaigns = campaigns.slice(0, 4);

  const metrics = [
    { label: "Total Contacts",    value: contacts.length,               icon: Users,            color: "text-primary",     bg: "bg-primary/10",     action: () => router.push("/contacts") },
    { label: "Active Contacts",   value: activeContacts,               icon: Users,            color: "text-primary",     bg: "bg-primary/10",     action: () => router.push("/contacts") },
    { label: "Live Campaigns",    value: activeCampaigns,              icon: Mail,             color: "text-blue-600",    bg: "bg-blue-500/10",    action: () => router.push("/campaigns") },
    { label: "Pending Leads",     value: pendingLeads,                 icon: Target,           color: "text-amber-600",   bg: "bg-amber-500/10",   action: () => router.push("/forms") },
    { label: "Conversion Rate",   value: `${conversionRate}%`,         icon: TrendingUp,       color: "text-violet-600",  bg: "bg-violet-500/10",  action: () => {} },
    { label: "Emails Sent",       value: totalSent,                    icon: Mail,             color: "text-blue-600",    bg: "bg-blue-500/10",    action: () => router.push("/campaigns") },
    { label: "Referrals Won",     value: convertedReferrals,           icon: Share2,           color: "text-orange-600",  bg: "bg-orange-500/10",  action: () => router.push("/referrals") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {pipelineAllLoaded || totalContactCount === 0
              ? `${contacts.length.toLocaleString()} contact${contacts.length === 1 ? "" : "s"}`
              : `Showing ${contacts.length.toLocaleString()} of ${totalContactCount.toLocaleString()} contacts`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/contacts")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
          </Button>
          <Button size="sm" onClick={() => router.push("/campaigns")}>
            <Mail className="h-3.5 w-3.5 mr-1" /> New Campaign
          </Button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.slice(0, 4).map((m) => (
          <Card
            key={m.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={m.action}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`rounded-lg p-2 ${m.bg}`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold font-heading text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: Pipeline Board vs Summary */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "pipeline" | "summary")}>
        <TabsList>
          <TabsTrigger value="pipeline">
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Pipeline Board
          </TabsTrigger>
          <TabsTrigger value="summary">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Summary
          </TabsTrigger>
        </TabsList>

        {/* ── Pipeline Kanban ── */}
        <TabsContent value="pipeline" className="mt-4">
          {/* Recently added contacts strip */}
          {contacts.length > 0 && (
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Recently added:</span>
              {contacts.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  className="flex items-center gap-1.5 shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted/60 transition-colors"
                >
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {c.first_name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="font-medium">{c.first_name} {c.last_name}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5">{c.status}</Badge>
                </button>
              ))}
              <Button variant="ghost" size="sm" className="text-xs shrink-0 h-7" onClick={() => router.push("/contacts")}>
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
          {contactsLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-3">
              {PIPELINE_STAGES.map((s) => (
                <div key={s.key} className="rounded-xl bg-muted/50 animate-pulse shrink-0" style={{ width: 240, height: 280 }} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto pb-3 -mx-1 px-1">
              <div className="flex gap-3" style={{ width: `max(100%, ${PIPELINE_STAGES.length * 252}px)` }}>
                {PIPELINE_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    contacts={byStage[stage.key] ?? []}
                    draggingId={draggingId}
                    onDragStart={(id) => setDraggingId(id)}
                    onDrop={handleDrop}
                    onNavigate={(id) => router.push(`/contacts?id=${id}`)}
                    onAddContact={(s) => setAddContactStage(s)}
                    onExpand={(s) => setExpandedStage(s)}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block opacity-50">
            Drag cards between columns · Scroll to see all stages
          </p>

          {/* Prominent Load more — only renders when more contacts remain on the
              server. With 5000 contacts the page-1 fetch returns 500, and the
              user clicks through this button to surface the rest into every
              column. */}
          {!pipelineAllLoaded && contacts.length > 0 && (
            <div className="mt-6">
              <button
                onClick={loadMorePipeline}
                disabled={loadingMore}
                className="group w-full rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent hover:from-primary/10 hover:border-primary/50 transition-all px-6 py-5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      {loadingMore ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <ChevronsDown className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {loadingMore ? "Loading more contacts…" : "Load more contacts"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {totalContactCount > 0 ? (
                          <>
                            Showing <strong className="text-foreground">{contacts.length.toLocaleString()}</strong> of{" "}
                            <strong className="text-foreground">{totalContactCount.toLocaleString()}</strong> total contacts. Click to load the next {Math.min(PIPELINE_PAGE_SIZE, totalContactCount - contacts.length).toLocaleString()}.
                          </>
                        ) : (
                          `Click to load the next ${PIPELINE_PAGE_SIZE} contacts.`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex shrink-0 items-center gap-2 text-xs font-semibold text-primary">
                    <span>Load batch</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Progress bar */}
                {totalContactCount > 0 && (
                  <div className="mt-4 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (contacts.length / totalContactCount) * 100)}%` }}
                    />
                  </div>
                )}
              </button>
            </div>
          )}

          {pipelineAllLoaded && contacts.length > PIPELINE_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All {contacts.length.toLocaleString()} contacts loaded
            </div>
          )}
        </TabsContent>

        {/* ── Summary ── */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {metrics.slice(4).map((m) => (
              <Card key={m.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={m.action}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`rounded-lg p-2 ${m.bg}`}>
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-heading text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Contacts */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-heading">Recent Contacts</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/contacts")}>
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No contacts yet</p>
                ) : (
                  contacts.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-1.5 border-b last:border-0 border-border/50 cursor-pointer hover:bg-muted/30 rounded px-1 transition-colors"
                      onClick={() => router.push("/contacts")}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground">{c.email || "No details"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Campaign Activity */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-heading">Campaign Activity</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/campaigns")}>
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mb-3">No campaigns yet</p>
                    <Button size="sm" onClick={() => router.push("/campaigns")}>Create First Campaign</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCampaigns.map((c: any) => {
                      const stats = (c.stats as Record<string, number> | null) ?? {};
                      const openRate = stats.opened && c.sent_count
                        ? Math.round((stats.opened / c.sent_count) * 100) : 0;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push("/campaigns")}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>{c.sent_count || 0} sent</span>
                              <span>{c.recipient_count || 0} recipients</span>
                              {openRate > 0 && <span className="text-emerald-600">{openRate}% opened</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${
                            c.status === "active"    ? "border-emerald-200 text-emerald-700 bg-emerald-500/10" :
                            c.status === "scheduled" ? "border-blue-200 text-blue-700 bg-blue-500/10" :
                            "border-border text-muted-foreground"
                          }`}>{c.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "New Campaign", icon: Mail,    path: "/campaigns", color: "text-primary" },
                  { label: "Add Contact",  icon: Users,   path: "/contacts",  color: "text-emerald-600" },
                  { label: "Referrals",    icon: Share2,  path: "/referrals", color: "text-blue-600" },
                  { label: "Analytics",    icon: TrendingUp, path: "/analytics", color: "text-violet-600" },
                ].map((a) => (
                  <Button key={a.label} variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push(a.path)}>
                    <a.icon className={`h-5 w-5 ${a.color}`} />
                    <span className="text-xs">{a.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stage Detail Sheet */}
      <StageSheet
        stage={expandedStage}
        contacts={expandedStage ? (byStage[expandedStage.key as PipelineStage] ?? []) : []}
        onClose={() => setExpandedStage(null)}
        onNavigate={(id) => { setExpandedStage(null); router.push(`/contacts?id=${id}`); }}
        onDragStart={(id) => setDraggingId(id)}
        onDrop={handleDrop}
        onTransfer={(id, toStage) => { stageMutation.mutate({ id, stage: toStage }); toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.key === toStage)?.label ?? toStage}`); }}
        draggingId={draggingId}
        onLoadMore={loadMorePipeline}
        hasMore={!pipelineAllLoaded}
        loadingMore={loadingMore}
        totalContactCount={totalContactCount}
        loadedCount={contacts.length}
      />

      {/* Contact Picker Dialog */}
      <Dialog open={!!addContactStage} onOpenChange={(o) => { if (!o) { setAddContactStage(null); setPickerSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact to Stage</DialogTitle>
            <DialogDescription>
              Move an existing contact into <strong>{PIPELINE_STAGES.find((s) => s.key === addContactStage)?.label}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              autoFocus
              placeholder="Search by name or email…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {contacts
                .filter((c) => (c.pipeline_stage ?? "") !== addContactStage)
                .filter((c) => {
                  const q = pickerSearch.toLowerCase();
                  return (
                    !q ||
                    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
                    (c.email ?? "").toLowerCase().includes(q)
                  );
                })
                .map((c) => (
                  <button
                    key={c.id}
                    disabled={moveToStageMutation.isPending}
                    onClick={() => addContactStage && moveToStageMutation.mutate({ id: c.id, stage: addContactStage })}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {initials(c.first_name, c.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.first_name} {c.last_name}</p>
                      {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                    </div>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                      {PIPELINE_STAGES.find((s) => s.key === c.pipeline_stage)?.label ?? c.pipeline_stage ?? "—"}
                    </span>
                  </button>
                ))}
              {contacts.filter((c) => (c.pipeline_stage ?? "") !== addContactStage).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">All contacts are already in this stage</p>
              )}
              {contacts.filter((c) => (c.pipeline_stage ?? "") !== addContactStage).filter((c) => {
                const q = pickerSearch.toLowerCase();
                return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
              }).length === 0 && pickerSearch && (
                <p className="text-sm text-muted-foreground text-center py-4">No contacts match "{pickerSearch}"</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
