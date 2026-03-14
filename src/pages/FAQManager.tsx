import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { FAQS, type FAQ, type InquiryCategory } from "@/lib/mock-data";
import { toast } from "sonner";

const CATEGORIES: InquiryCategory[] = [
  "Appointment_Scheduling",
  "Prescription_Lab_Requests",
  "Health_Questions",
  "Billing_Insurance",
  "Urgent_Red_Flags",
  "General_Info",
];

const FAQManager = () => {
  const [faqs, setFaqs] = useState<FAQ[]>(FAQS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "General_Info" as InquiryCategory });

  const filtered = faqs.filter((f) => {
    if (search && !f.question.toLowerCase().includes(search.toLowerCase()) && !f.answer.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    return true;
  });

  const openNew = () => {
    setEditingFaq(null);
    setForm({ question: "", answer: "", category: "General_Info" });
    setDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }
    if (editingFaq) {
      setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? { ...f, ...form } : f)));
      toast.success("FAQ updated");
    } else {
      setFaqs((prev) => [...prev, { id: `f${Date.now()}`, ...form, active: true }]);
      toast.success("FAQ created");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    setDeletingFaqId(null);
    toast.success("FAQ deleted");
  };

  const toggleActive = (id: string) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
  };

  const activeCount = faqs.filter(f => f.active).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">FAQ Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {faqs.length} FAQs · {activeCount} active · Manage auto-responses for common patient inquiries
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5 gradient-brand text-primary-foreground">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((faq) => (
          <div
            key={faq.id}
            className={`rounded-lg border bg-card p-4 shadow-card transition-opacity ${!faq.active ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{faq.question}</h3>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <CategoryBadge category={faq.category} />
                <button onClick={() => toggleActive(faq.id)} className="p-1.5 hover:bg-accent rounded-md transition-colors">
                  {faq.active ? (
                    <ToggleRight className="h-4 w-4 text-category-health" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button onClick={() => openEdit(faq)} className="p-1.5 hover:bg-accent rounded-md transition-colors">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeletingFaqId(faq.id)} className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No FAQs found</p>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Question</Label>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. What are your office hours?" />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="The response patients will receive..." className="min-h-[120px]" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InquiryCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="gradient-brand text-primary-foreground">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFaqId} onOpenChange={(open) => !open && setDeletingFaqId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this FAQ and its auto-response. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingFaqId && handleDelete(deletingFaqId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FAQManager;
