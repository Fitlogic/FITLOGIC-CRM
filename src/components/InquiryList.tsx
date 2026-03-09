import { useState } from "react";
import { Mail, Globe, Phone, PenLine, Search, Filter, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Inquiry, InquiryCategory, InquiryStatus } from "@/lib/mock-data";

const sourceIcons = { email: Mail, portal: Globe, phone: Phone, manual: PenLine };

interface Props {
  inquiries: Inquiry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function InquiryList({ inquiries, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = inquiries.filter((inq) => {
    if (search && !inq.patientName.toLowerCase().includes(search.toLowerCase()) && !inq.rawContent.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && inq.category !== categoryFilter) return false;
    if (statusFilter !== "all" && inq.status !== statusFilter) return false;
    return true;
  });

  // Sort: escalated first, then pending, then by date
  const sorted = [...filtered].sort((a, b) => {
    const priority: Record<InquiryStatus, number> = { escalated: 0, pending: 1, assigned: 2, auto_responded: 3, resolved: 4 };
    if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const urgentCount = inquiries.filter((i) => i.status === "escalated" || i.category === "Urgent_Red_Flags").length;
  const pendingCount = inquiries.filter((i) => i.status === "pending").length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-heading font-bold">{inquiries.length}</span>
          <span className="text-sm text-muted-foreground">Total</span>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-category-urgent/10 px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 text-category-urgent" />
            <span className="text-xs font-medium text-category-urgent">{urgentCount} Urgent</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-status-pending/10 px-3 py-1">
          <span className="text-xs font-medium text-status-pending">{pendingCount} Pending</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Appointment_Scheduling">Scheduling</SelectItem>
            <SelectItem value="Health_Questions">Health</SelectItem>
            <SelectItem value="Prescription_Lab_Requests">Rx / Labs</SelectItem>
            <SelectItem value="Billing_Insurance">Billing</SelectItem>
            <SelectItem value="Urgent_Red_Flags">Urgent</SelectItem>
            <SelectItem value="General_Info">General</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="auto_responded">Auto</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {sorted.map((inq) => {
          const SourceIcon = sourceIcons[inq.source];
          const isSelected = selectedId === inq.id;
          const isUrgent = inq.category === "Urgent_Red_Flags" || inq.status === "escalated";

          return (
            <button
              key={inq.id}
              onClick={() => onSelect(inq.id)}
              className={cn(
                "w-full text-left px-4 py-3.5 border-b transition-colors hover:bg-accent/50",
                isSelected && "bg-accent border-l-2 border-l-primary",
                isUrgent && !isSelected && "bg-category-urgent/5 border-l-2 border-l-category-urgent"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <SourceIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{inq.patientName}</span>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(inq.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{inq.rawContent}</p>
              <div className="flex items-center gap-1.5">
                <CategoryBadge category={inq.category} />
                <StatusBadge status={inq.status} />
                {inq.categoryConfidence < 0.9 && (
                  <span className="text-[10px] text-muted-foreground">({Math.round(inq.categoryConfidence * 100)}%)</span>
                )}
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">No inquiries match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
