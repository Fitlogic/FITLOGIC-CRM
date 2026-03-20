import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Users, Plus, Search, MoreHorizontal, Mail, Phone, Calendar,
  Shield, Eye, Pencil, Trash2, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PatientForm, type PatientFormData } from "@/components/PatientForm";
import { PatientTimeline } from "@/components/PatientTimeline";

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  insurance_provider: string | null;
  insurance_id: string | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  inactive: "bg-amber-500/10 text-amber-700 border-amber-200",
  archived: "bg-muted text-muted-foreground border-border",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(f: string, l: string) {
  return `${f[0] || ""}${l[0] || ""}`.toUpperCase();
}

export default function Patients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Patient[];
    },
  });

  const parseTags = (t: string) => t ? t.split(",").map(s => s.trim()).filter(Boolean) : [];

  const addMutation = useMutation({
    mutationFn: async (form: PatientFormData) => {
      const { error } = await supabase.from("patients").insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        insurance_provider: form.insurance_provider || null,
        insurance_id: form.insurance_id || null,
        status: form.status,
        tags: parseTags(form.tags),
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setFormOpen(false);
      toast({ title: "Contact added" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: PatientFormData }) => {
      const { data, error } = await supabase.from("patients").update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        insurance_provider: form.insurance_provider || null,
        insurance_id: form.insurance_id || null,
        status: form.status,
        tags: parseTags(form.tags),
        notes: form.notes || null,
      }).eq("id", id).select().single();
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (updatedPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (viewing && viewing.id === updatedPatient.id) {
        setViewing(updatedPatient);
      }
      setEditing(null);
      setFormOpen(false);
      toast({ title: "Contact updated" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setDeleteTarget(null);
      if (viewing?.id === deleteTarget?.id) setViewing(null);
      toast({ title: "Patient deleted" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.phone?.includes(q) ?? false)
    );
  });

  // Detail view
  if (viewing) {
    const p = viewing;
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setViewing(null)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to contacts
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="gradient-brand text-primary-foreground font-heading">
                {initials(p.first_name, p.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {p.first_name} {p.last_name}
              </h1>
              <Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(p); setFormOpen(true); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(p)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {p.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {p.phone || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> Lead Source: {p.gender || "—"}
              </div>
              <p className="text-muted-foreground">
                {[p.address, p.city, p.state, p.zip_code].filter(Boolean).join(", ") || "No address on file"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Company & Deal</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" /> {p.insurance_provider || "No company"}
              </div>
              <p className="text-muted-foreground">Deal Value: {p.insurance_id || "—"}</p>
            </CardContent>
          </Card>

          {(p.notes || (p.tags && p.tags.length > 0)) && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Notes & Tags</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {p.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.notes}</p>}
              </CardContent>
            </Card>
          )}

          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <PatientTimeline patientId={p.id} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Record Info</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Created: {formatDate(p.created_at)}</p>
              <p>Last updated: {formatDate(p.updated_at)}</p>
              <p className="font-mono">ID: {p.id}</p>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {deleteTarget?.first_name} {deleteTarget?.last_name} from your pipeline.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {patients.length} contact{patients.length !== 1 ? "s" : ""} in your pipeline
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading contacts…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">{search ? "No contacts match your search" : "No contacts yet — add your first one"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email / Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setViewing(p)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 text-xs">
                          <AvatarFallback className="gradient-brand text-primary-foreground font-heading">
                            {initials(p.first_name, p.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground">Added {formatDate(p.created_at)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{p.email || "—"}</div>
                      <div className="text-xs">{p.phone || ""}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.insurance_provider || "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(p)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update contact information below." : "Enter contact details to add to your pipeline."}
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            defaultValues={editing ? {
              first_name: editing.first_name,
              last_name: editing.last_name,
              email: editing.email || "",
              phone: editing.phone || "",
              date_of_birth: editing.date_of_birth || "",
              gender: editing.gender || "",
              address: editing.address || "",
              city: editing.city || "",
              state: editing.state || "",
              zip_code: editing.zip_code || "",
              insurance_provider: editing.insurance_provider || "",
              insurance_id: editing.insurance_id || "",
              status: editing.status,
              tags: (editing.tags || []).join(", "),
              notes: editing.notes || "",
            } : undefined}
            onSubmit={(data) =>
              editing
                ? updateMutation.mutate({ id: editing.id, form: data })
                : addMutation.mutate(data)
            }
            onCancel={() => { setFormOpen(false); setEditing(null); }}
            isSubmitting={addMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {deleteTarget?.first_name} {deleteTarget?.last_name} from your pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
