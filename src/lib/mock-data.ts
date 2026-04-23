export type InquiryCategory =
  | "Appointment_Scheduling"
  | "Prescription_Lab_Requests"
  | "Health_Questions"
  | "Billing_Insurance"
  | "Urgent_Red_Flags"
  | "General_Info";

export type InquiryStatus =
  | "pending"
  | "auto_responded"
  | "assigned"
  | "resolved"
  | "escalated";

export type InquirySource = "email" | "portal" | "phone" | "manual";

export interface Inquiry {
  id: string;
  patientName: string;
  patientEmail: string;
  source: InquirySource;
  rawContent: string;
  category: InquiryCategory;
  categoryConfidence: number;
  isFaqMatch: boolean;
  assignedTo: string | null;
  status: InquiryStatus;
  createdAt: string;
  resolvedAt: string | null;
  responseText: string | null;
  staffNotes: string | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: InquiryCategory;
  active: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "owner" | "admin" | "receptionist" | "clinical";
  email: string;
  categoriesHandled: InquiryCategory[];
  active: boolean;
}

export const STAFF: StaffMember[] = [
  {
    id: "s1",
    name: "Megan",
    role: "owner",
    email: "megan@fitlogic.com",
    categoriesHandled: ["Health_Questions", "Prescription_Lab_Requests", "Urgent_Red_Flags"],
    active: true,
  },
  {
    id: "s2",
    name: "Sarah",
    role: "receptionist",
    email: "sarah@fitlogic.com",
    categoriesHandled: ["Appointment_Scheduling", "General_Info"],
    active: true,
  },
  {
    id: "s3",
    name: "Jamie",
    role: "admin",
    email: "jamie@fitlogic.com",
    categoriesHandled: ["Billing_Insurance", "General_Info"],
    active: true,
  },
];

export const FAQS: FAQ[] = [
  {
    id: "f1",
    question: "How do I refill my prescription?",
    answer: "To refill a prescription:\n1. Log into the patient portal\n2. Click 'Medication Refills'\n3. Select the medication you need\n4. Submit the request\nWe typically process refills within 24-48 hours.",
    category: "Prescription_Lab_Requests",
    active: true,
  },
  {
    id: "f2",
    question: "What are your office hours?",
    answer: "Monday-Friday 9 AM - 5 PM, Saturday 10 AM - 2 PM. Closed Sundays.",
    category: "General_Info",
    active: true,
  },
  {
    id: "f3",
    question: "How much does an initial consultation cost?",
    answer: "Our initial consultation is $150 and lasts 60 minutes. This includes health history, assessment, and initial recommendations.",
    category: "Billing_Insurance",
    active: true,
  },
  {
    id: "f4",
    question: "Do you accept insurance?",
    answer: "We are an out-of-network provider. We can provide a superbill for you to submit to your insurance for potential reimbursement.",
    category: "Billing_Insurance",
    active: true,
  },
  {
    id: "f5",
    question: "How do I schedule an appointment?",
    answer: "You can schedule online at our booking page, call us at (555) 123-4567, or reply to this email with your preferred date and time.",
    category: "Appointment_Scheduling",
    active: true,
  },
];

export const INQUIRIES: Inquiry[] = [
  {
    id: "i1",
    patientName: "Lisa Rodriguez",
    patientEmail: "lisa.r@email.com",
    source: "email",
    rawContent: "Hi, I've been experiencing severe chest pain and shortness of breath since yesterday morning. Should I come in or go to the ER?",
    category: "Urgent_Red_Flags",
    categoryConfidence: 0.97,
    isFaqMatch: false,
    assignedTo: "s1",
    status: "escalated",
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    resolvedAt: null,
    responseText: null,
    staffNotes: null,
  },
  {
    id: "i2",
    patientName: "Mark Chen",
    patientEmail: "mark.c@email.com",
    source: "portal",
    rawContent: "I'd like to schedule a follow-up appointment for next week. Any openings on Tuesday or Wednesday afternoon?",
    category: "Appointment_Scheduling",
    categoryConfidence: 0.95,
    isFaqMatch: false,
    assignedTo: "s2",
    status: "assigned",
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    resolvedAt: null,
    responseText: null,
    staffNotes: null,
  },
  {
    id: "i3",
    patientName: "Angela White",
    patientEmail: "angela.w@email.com",
    source: "email",
    rawContent: "What are your office hours? I tried calling but nobody picked up.",
    category: "General_Info",
    categoryConfidence: 0.92,
    isFaqMatch: true,
    assignedTo: null,
    status: "auto_responded",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 3600000 + 30000).toISOString(),
    responseText: "Monday-Friday 9 AM - 5 PM, Saturday 10 AM - 2 PM. Closed Sundays.",
    staffNotes: null,
  },
  {
    id: "i4",
    patientName: "James Peterson",
    patientEmail: "james.p@email.com",
    source: "phone",
    rawContent: "Patient called asking about lab results from blood work done last week. Wants to know when results will be available.",
    category: "Prescription_Lab_Requests",
    categoryConfidence: 0.88,
    isFaqMatch: false,
    assignedTo: null,
    status: "pending",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    resolvedAt: null,
    responseText: null,
    staffNotes: null,
  },
  {
    id: "i5",
    patientName: "Diana Foster",
    patientEmail: "diana.f@email.com",
    source: "email",
    rawContent: "I'm having joint pain in my knees, especially when I wake up in the morning. It started about two weeks ago. Is this something I should be concerned about?",
    category: "Health_Questions",
    categoryConfidence: 0.91,
    isFaqMatch: false,
    assignedTo: null,
    status: "pending",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    resolvedAt: null,
    responseText: null,
    staffNotes: null,
  },
  {
    id: "i6",
    patientName: "Robert Kim",
    patientEmail: "robert.k@email.com",
    source: "portal",
    rawContent: "Do you accept Blue Cross Blue Shield insurance? I'm looking for a new functional medicine doctor and want to make sure you're in-network.",
    category: "Billing_Insurance",
    categoryConfidence: 0.94,
    isFaqMatch: true,
    assignedTo: null,
    status: "auto_responded",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 5 * 3600000 + 25000).toISOString(),
    responseText: "We are an out-of-network provider. We can provide a superbill for you to submit to your insurance for potential reimbursement.",
    staffNotes: null,
  },
  {
    id: "i7",
    patientName: "Sandra Mitchell",
    patientEmail: "sandra.m@email.com",
    source: "email",
    rawContent: "I need to refill my thyroid medication. Can you send a new prescription to my pharmacy?",
    category: "Prescription_Lab_Requests",
    categoryConfidence: 0.93,
    isFaqMatch: false,
    assignedTo: "s1",
    status: "assigned",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    resolvedAt: null,
    responseText: null,
    staffNotes: "Checked chart — thyroid meds due for refill. Sent to pharmacy.",
  },
  {
    id: "i8",
    patientName: "Tom Walker",
    patientEmail: "tom.w@email.com",
    source: "manual",
    rawContent: "Walk-in patient asking about group hormone optimization program. Wants pricing and schedule info.",
    category: "General_Info",
    categoryConfidence: 0.85,
    isFaqMatch: false,
    assignedTo: "s2",
    status: "resolved",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    responseText: "Provided group program brochure and pricing sheet. Patient took materials home.",
    staffNotes: "Interested in next cohort starting March 15.",
  },
];

export const CATEGORY_CONFIG: Record<InquiryCategory, { label: string; color: string; bgColor: string }> = {
  Appointment_Scheduling: { label: "Consultations", color: "text-category-scheduling", bgColor: "bg-category-scheduling/10" },
  Health_Questions: { label: "Results & Outcomes", color: "text-category-health", bgColor: "bg-category-health/10" },
  Prescription_Lab_Requests: { label: "Services & Programs", color: "text-category-prescription", bgColor: "bg-category-prescription/10" },
  Billing_Insurance: { label: "Pricing & Payment", color: "text-category-billing", bgColor: "bg-category-billing/10" },
  Urgent_Red_Flags: { label: "Urgent / Escalation", color: "text-category-urgent", bgColor: "bg-category-urgent/10" },
  General_Info: { label: "General", color: "text-category-general", bgColor: "bg-category-general/10" },
};

export const STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending", color: "text-status-pending", bgColor: "bg-status-pending/10" },
  assigned: { label: "Assigned", color: "text-status-assigned", bgColor: "bg-status-assigned/10" },
  auto_responded: { label: "Auto", color: "text-status-auto", bgColor: "bg-status-auto/10" },
  resolved: { label: "Resolved", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  escalated: { label: "Escalated", color: "text-status-escalated", bgColor: "bg-status-escalated/10" },
};

export const SOURCE_ICONS: Record<InquirySource, string> = {
  email: "Mail",
  portal: "Globe",
  phone: "Phone",
  manual: "PenLine",
};
