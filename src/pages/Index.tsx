import { useState } from "react";
import { INQUIRIES, type Inquiry } from "@/lib/mock-data";
import { InquiryList } from "@/components/InquiryList";
import { InquiryDetail } from "@/components/InquiryDetail";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>(INQUIRIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedInquiry = inquiries.find((i) => i.id === selectedId) || null;

  const handleUpdate = (id: string, updates: Partial<Inquiry>) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, ...updates } : inq)));
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: Inquiry List */}
      <div className="w-[420px] border-r flex-shrink-0 bg-card">
        <InquiryList inquiries={inquiries} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Right: Detail Panel */}
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
    </div>
  );
};

export default Index;
