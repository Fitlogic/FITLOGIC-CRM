import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Building2, MapPin, Tag, StickyNote } from "lucide-react";

export interface PatientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  insurance_provider: string;
  insurance_id: string;
  status: string;
  tags: string;
  notes: string;
}

interface PatientFormProps {
  defaultValues?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PatientForm({ defaultValues, onSubmit, onCancel, isSubmitting }: PatientFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm<PatientFormData>({
    defaultValues: {
      first_name: "", last_name: "", email: "", phone: "", date_of_birth: "",
      gender: "", address: "", city: "", state: "", zip_code: "",
      insurance_provider: "", insurance_id: "", status: "active", tags: "", notes: "",
      ...defaultValues,
    },
  });

  const gender = watch("gender");
  const status = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
      {/* Personal Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <User className="h-3.5 w-3.5" /> Contact Information
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs">First Name *</Label>
            <Input id="first_name" {...register("first_name", { required: true })} placeholder="Jane" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs">Last Name *</Label>
            <Input id="last_name" {...register("last_name", { required: true })} placeholder="Smith" className="h-9" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="jane@company.com" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="(555) 123-4567" className="h-9" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Company & Deal */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Building2 className="h-3.5 w-3.5" /> Company & Deal
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="insurance_provider" className="text-xs">Company</Label>
            <Input id="insurance_provider" {...register("insurance_provider")} placeholder="Acme Corp" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insurance_id" className="text-xs">Deal Value</Label>
            <Input id="insurance_id" {...register("insurance_id")} placeholder="$5,000" className="h-9" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Lead Source</Label>
            <Select value={gender} onValueChange={(v) => setValue("gender", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Lead</SelectItem>
                <SelectItem value="inactive">Cold</SelectItem>
                <SelectItem value="archived">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <MapPin className="h-3.5 w-3.5" /> Location
        </div>
        <div className="space-y-1.5">
          <Input id="address" {...register("address")} placeholder="Street address" className="h-9" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input {...register("city")} placeholder="City" className="h-9" />
          <Input {...register("state")} placeholder="State" className="h-9" />
          <Input {...register("zip_code")} placeholder="ZIP" className="h-9" />
        </div>
      </div>

      <Separator />

      {/* Tags & Notes */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Tag className="h-3.5 w-3.5" /> Tags
          </div>
          <Input {...register("tags")} placeholder="vip, hot-lead, follow-up (comma-separated)" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </div>
          <Textarea {...register("notes")} placeholder="Meeting notes, deal details, next steps..." rows={3} />
        </div>
      </div>

      <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : defaultValues?.first_name ? "Update Contact" : "Add Contact"}
        </Button>
      </DialogFooter>
    </form>
  );
}
