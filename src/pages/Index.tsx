import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InquiryList, type InquiryRow } from "@/components/InquiryList";
import { InquiryDetail } from "@/components/InquiryDetail";
import { MessageSquare, Plus, Phone, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { InquiryCategory, InquirySource } from "@/lib/types";

const CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: "Appointment_Scheduling", label: "Scheduling" },
  { value: "Prescription_Lab_Requests", label: "Rx / Labs" },
  { value: "Health_Questions", label: "Health" },
  { value: "Billing_Insurance", label: "Billing" },
  { value: "Urgent_Red_Flags", label: "Urgent" },
  { value: "General_Info", label: "General" },
];

const Index = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const [newInquiry, setNewInquiry] = useState({
    patientName: "",
    patientEmail: "",
    source: "phone" as InquirySource,
    rawContent: "",
    category: "General_Info" as InquiryCategory,
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InquiryRow[];
    },
  });

  const selectedInquiry = inquiries.find((i) => i.id === selectedId) || null;

  const handleUpdate = (id: string, updates: Partial<InquiryRow>) => {
    // Optimistic update
    queryClient.setQueryData(["inquiries"], (old: InquiryRow[] | undefined) =>
      old?.map((inq) => (inq.id === id ? { ...inq, ...updates } : inq)) || []
    );
  };

  const createMutation = useMutation({
    mutationFn: async (input: typeof newInquiry) => {
      // Auto-create patient via DB function
      const { data: patientId } = await supabase.rpc("find_or_create_patient", {
        p_name: input.patientName,
        p_email: input.patientEmail || null,
      });

      const { data, error } = await supabase.from("inquiries").insert({
        patient_id: patientId,
        patient_name: input.patientName,
        patient_email: input.patientEmail || null,
        source: input.source,
        raw_content: input.rawContent,
        category: input.category,
        category_confidence: 1,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setSelectedId(data.id);
      setShowNewInquiry(false);
      setNewInquiry({ patientName: "", patientEmail: "", source: "phone", rawContent: "", category: "General_Info" });
      toast.success("Inquiry created");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateInquiry = () => {
    if (!newInquiry.patientName.trim() || !newInquiry.rawContent.trim()) {
      toast.error("Patient name and message are required");
      return;
    }
    createMutation.mutate(newInquiry);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-[420px] border-r flex-shrink-0 bg-card flex flex-col">
        <div className="p-3 border-b flex justify-end">
          <Button size="sm" className="gradient-brand text-primary-foreground" onClick={() => setShowNewInquiry(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Log Inquiry
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <InquiryList inquiries={inquiries} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selectedInquiry ? (
          <InquiryDetail inquiry={selectedInquiry} onUpdate={handleUpdate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="rounded-2xl gradient-brand p-5 mb-4 shadow-glow">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Inquiry Dashboard</h3>
            <p className="text-sm">Select an inquiry to view details and respond</p>
          </div>
        )}
      </div>

      <Dialog open={showNewInquiry} onOpenChange={setShowNewInquiry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" /> Log New Inquiry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient Name *</Label>
              <Input value={newInquiry.patientName} onChange={(e) => setNewInquiry((p) => ({ ...p, patientName: e.target.value }))} placeholder="e.g. Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={newInquiry.patientEmail} onChange={(e) => setNewInquiry((p) => ({ ...p, patientEmail: e.target.value }))} placeholder="patient@email.com" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={newInquiry.source} onValueChange={(v) => setNewInquiry((p) => ({ ...p, source: v as InquirySource }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone"><span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</span></SelectItem>
                    <SelectItem value="manual"><span className="flex items-center gap-1.5"><PenLine className="h-3 w-3" /> Walk-in</span></SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newInquiry.category} onValueChange={(v) => setNewInquiry((p) => ({ ...p, category: v as InquiryCategory }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Message / Notes *</Label>
              <Textarea value={newInquiry.rawContent} onChange={(e) => setNewInquiry((p) => ({ ...p, rawContent: e.target.value }))} placeholder="Describe the patient's inquiry..." className="mt-1 min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInquiry(false)}>Cancel</Button>
            <Button className="gradient-brand text-primary-foreground" onClick={handleCreateInquiry} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Inquiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
