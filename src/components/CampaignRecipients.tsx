import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Users, Plus, Trash2, Search, UserPlus, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export interface Recipient {
  email: string;
  name: string;
  patient_id?: string;
  source: "customer" | "csv_import" | "manual";
}

interface CampaignRecipientsProps {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
}

export function CampaignRecipients({ recipients, onChange }: CampaignRecipientsProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set(recipients.filter(r => r.patient_id).map(r => r.patient_id!))
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-campaign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email")
        .not("email", "is", null)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const toggleCustomer = (c: typeof customers[0]) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(c.id)) {
      next.delete(c.id);
      onChange(recipients.filter(r => r.patient_id !== c.id));
    } else {
      next.add(c.id);
      onChange([...recipients, { email: c.email!, name: `${c.first_name} ${c.last_name}`, patient_id: c.id, source: "customer" }]);
    }
    setSelectedCustomerIds(next);
  };

  const selectAll = () => {
    const eligible = filteredCustomers.filter(c => c.email);
    const next = new Set(selectedCustomerIds);
    const newRecipients = [...recipients];
    eligible.forEach(c => {
      if (!next.has(c.id)) {
        next.add(c.id);
        newRecipients.push({ email: c.email!, name: `${c.first_name} ${c.last_name}`, patient_id: c.id, source: "customer" });
      }
    });
    setSelectedCustomerIds(next);
    onChange(newRecipients);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const header = lines[0].toLowerCase();
      const emailIdx = header.split(",").findIndex(h => h.trim().includes("email"));
      const nameIdx = header.split(",").findIndex(h => h.trim().includes("name"));
      if (emailIdx === -1) {
        toast({ title: "CSV Error", description: "No 'email' column found. Ensure your CSV has an 'email' header.", variant: "destructive" });
        return;
      }
      const imported: Recipient[] = [];
      const existingEmails = new Set(recipients.map(r => r.email.toLowerCase()));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const email = cols[emailIdx];
        if (email && email.includes("@") && !existingEmails.has(email.toLowerCase())) {
          imported.push({ email, name: nameIdx >= 0 ? cols[nameIdx] || "" : "", source: "csv_import" });
          existingEmails.add(email.toLowerCase());
        }
      }
      onChange([...recipients, ...imported]);
      toast({ title: `Imported ${imported.length} contacts` });
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addManual = () => {
    if (!manualEmail.includes("@")) return;
    if (recipients.some(r => r.email.toLowerCase() === manualEmail.toLowerCase())) {
      toast({ title: "Duplicate", description: "This email is already added.", variant: "destructive" });
      return;
    }
    onChange([...recipients, { email: manualEmail, name: manualName, source: "manual" }]);
    setManualEmail("");
    setManualName("");
  };

  const removeRecipient = (email: string) => {
    const removed = recipients.find(r => r.email === email);
    if (removed?.patient_id) {
      const next = new Set(selectedCustomerIds);
      next.delete(removed.patient_id);
      setSelectedCustomerIds(next);
    }
    onChange(recipients.filter(r => r.email !== email));
  };

  const customerCount = recipients.filter(r => r.source === "customer").length;
  const csvCount = recipients.filter(r => r.source === "csv_import").length;
  const manualCount = recipients.filter(r => r.source === "manual").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm text-foreground">Recipients</h3>
          <p className="text-xs text-muted-foreground">
            {recipients.length} contact{recipients.length !== 1 ? "s" : ""} selected
            {customerCount > 0 && <span className="ml-1">• {customerCount} customers</span>}
            {csvCount > 0 && <span className="ml-1">• {csvCount} imported</span>}
            {manualCount > 0 && <span className="ml-1">• {manualCount} manual</span>}
          </p>
        </div>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="customers" className="text-xs"><Users className="h-3 w-3 mr-1" />Customers</TabsTrigger>
          <TabsTrigger value="csv" className="text-xs"><FileSpreadsheet className="h-3 w-3 mr-1" />CSV Import</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs"><UserPlus className="h-3 w-3 mr-1" />Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-2 mt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search customers..." className="pl-7 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={selectAll}>
              <Check className="h-3 w-3 mr-1" />Select All
            </Button>
          </div>
          <ScrollArea className="h-[180px] rounded border p-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No customers with emails found</p>
            ) : filteredCustomers.map(c => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                <Checkbox checked={selectedCustomerIds.has(c.id)} onCheckedChange={() => toggleCustomer(c)} />
                <span className="font-medium">{c.first_name} {c.last_name}</span>
                <span className="text-muted-foreground ml-auto truncate max-w-[180px]">{c.email}</span>
              </label>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="csv" className="space-y-3 mt-2">
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground mb-2">Upload a CSV with <code className="text-[10px] bg-muted px-1 rounded">email</code> and optionally <code className="text-[10px] bg-muted px-1 rounded">name</code> columns</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
              <Button variant="outline" size="sm" className="text-xs" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />Choose CSV File
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-2 mt-2">
          <div className="flex gap-2">
            <Input placeholder="Name" className="h-8 text-xs" value={manualName} onChange={e => setManualName(e.target.value)} />
            <Input placeholder="email@example.com" className="h-8 text-xs flex-1" value={manualEmail} onChange={e => setManualEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addManual()} />
            <Button size="sm" className="h-8 text-xs" onClick={addManual} disabled={!manualEmail.includes("@")}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected recipients list */}
      {recipients.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Selected ({recipients.length})</Label>
          <ScrollArea className="h-[100px] rounded border p-1">
            {recipients.map(r => (
              <div key={r.email} className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {r.source === "customer" ? "CRM" : r.source === "csv_import" ? "CSV" : "Manual"}
                  </Badge>
                  <span className="truncate">{r.name || r.email}</span>
                  {r.name && <span className="text-muted-foreground truncate">{r.email}</span>}
                </div>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removeRecipient(r.email)}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
