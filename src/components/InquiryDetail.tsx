import { useState } from "react";
import { Mail, Globe, Phone, PenLine, Clock, User, Send, AlertTriangle, CheckCircle, ArrowUpRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBadge } from "@/components/CategoryBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { STAFF, type Inquiry, type InquiryStatus } from "@/lib/mock-data";
import { toast } from "sonner";

const sourceIcons = { email: Mail, portal: Globe, phone: Phone, manual: PenLine };
const sourceLabels = { email: "Email", portal: "Patient Portal", phone: "Phone Call", manual: "Manual Entry" };

const QUICK_REPLIES = [
  "Thanks for reaching out! We'll get back to you within 24 hours.",
  "Your appointment has been confirmed. See you soon!",
  "Lab results typically process within 3-5 business days.",
  "Please call our office at (555) 123-4567 for immediate assistance.",
];

interface Props {
  inquiry: Inquiry;
  onUpdate: (id: string, updates: Partial<Inquiry>) => void;
}

export function InquiryDetail({ inquiry, onUpdate }: Props) {
  const [reply, setReply] = useState("");
  const SourceIcon = sourceIcons[inquiry.source];
  const assignedStaff = STAFF.find((s) => s.id === inquiry.assignedTo);

  const handleAssign = (staffId: string) => {
    onUpdate(inquiry.id, { assignedTo: staffId, status: "assigned" as InquiryStatus });
    const staff = STAFF.find((s) => s.id === staffId);
    toast.success(`Assigned to ${staff?.name}`);
  };

  const handleResolve = () => {
    onUpdate(inquiry.id, { status: "resolved", resolvedAt: new Date().toISOString(), responseText: reply || undefined });
    toast.success("Inquiry resolved");
  };

  const handleEscalate = () => {
    onUpdate(inquiry.id, { status: "escalated", assignedTo: "s1" });
    toast.warning("Escalated to Megan");
  };

  const handleSendReply = () => {
    if (!reply.trim()) return;
    onUpdate(inquiry.id, { responseText: reply, status: "resolved", resolvedAt: new Date().toISOString() });
    toast.success("Reply sent & inquiry resolved");
    setReply("");
  };

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-heading text-lg font-bold">{inquiry.patientName}</h2>
            <p className="text-sm text-muted-foreground">{inquiry.patientEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={inquiry.category} />
            <StatusBadge status={inquiry.status} />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <SourceIcon className="h-3.5 w-3.5" />
            {sourceLabels[inquiry.source]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(inquiry.createdAt), "MMM d, h:mm a")}
          </span>
          {assignedStaff && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {assignedStaff.name}
            </span>
          )}
          <span className="ml-auto text-[11px]">
            AI Confidence: {Math.round(inquiry.categoryConfidence * 100)}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
        {/* Message */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm leading-relaxed">{inquiry.rawContent}</p>
        </div>

        {/* Auto-response notice */}
        {inquiry.isFaqMatch && inquiry.responseText && (
          <div className="rounded-lg border border-status-auto/30 bg-status-auto/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-status-auto" />
              <span className="text-xs font-medium text-status-auto">Auto-Response Sent</span>
            </div>
            <p className="text-sm text-muted-foreground">{inquiry.responseText}</p>
          </div>
        )}

        {/* Staff notes */}
        {inquiry.staffNotes && (
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Staff Notes</p>
            <p className="text-sm">{inquiry.staffNotes}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        {inquiry.status !== "resolved" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={inquiry.assignedTo || ""} onValueChange={handleAssign}>
                <SelectTrigger className="w-[180px] h-9">
                  <User className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {STAFF.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleResolve} className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Resolve
              </Button>

              {inquiry.status !== "escalated" && (
                <Button variant="destructive" size="sm" onClick={handleEscalate} className="gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalate
                </Button>
              )}
            </div>

            {/* Quick replies */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Replies</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => setReply(qr)}
                    className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent transition-colors text-left"
                  >
                    {qr.substring(0, 50)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Reply composer */}
            <div>
              <Textarea
                placeholder="Write a reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="min-h-[100px] bg-background"
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handleSendReply} disabled={!reply.trim()} className="gap-1.5 gradient-brand text-primary-foreground">
                  <Send className="h-3.5 w-3.5" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resolved info */}
        {inquiry.status === "resolved" && inquiry.resolvedAt && (
          <div className="rounded-lg border-status-resolved/30 bg-status-resolved/5 border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-resolved" />
              <span className="text-sm font-medium text-status-resolved">
                Resolved {format(new Date(inquiry.resolvedAt), "MMM d, h:mm a")}
              </span>
            </div>
            {inquiry.responseText && !inquiry.isFaqMatch && (
              <p className="text-sm text-muted-foreground mt-2">{inquiry.responseText}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
