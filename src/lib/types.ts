// Shared type definitions used across the app

export type InquiryCategory =
  | "Appointment_Scheduling"
  | "Prescription_Lab_Requests"
  | "Health_Questions"
  | "Billing_Insurance"
  | "Urgent_Red_Flags"
  | "General_Info";

export type InquiryStatus = "pending" | "auto_responded" | "assigned" | "resolved" | "escalated";
export type InquirySource = "email" | "portal" | "phone" | "manual";

export type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "date" | "dropdown" | "number";

export interface FormQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  placeholder?: string;
}

export type SubmissionStatus = "incomplete" | "complete" | "submitted" | "approved" | "needs_revision";
export type ReviewStatus = "pending" | "approved" | "needs_revision";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

// Config maps
export const CATEGORY_CONFIG: Record<InquiryCategory, { label: string; color: string; bgColor: string }> = {
  Appointment_Scheduling: { label: "Scheduling", color: "text-category-scheduling", bgColor: "bg-category-scheduling/10" },
  Health_Questions: { label: "Health", color: "text-category-health", bgColor: "bg-category-health/10" },
  Prescription_Lab_Requests: { label: "Rx / Labs", color: "text-category-prescription", bgColor: "bg-category-prescription/10" },
  Billing_Insurance: { label: "Billing", color: "text-category-billing", bgColor: "bg-category-billing/10" },
  Urgent_Red_Flags: { label: "Urgent", color: "text-category-urgent", bgColor: "bg-category-urgent/10" },
  General_Info: { label: "General", color: "text-category-general", bgColor: "bg-category-general/10" },
};

export const STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending", color: "text-status-pending", bgColor: "bg-status-pending/10" },
  assigned: { label: "Assigned", color: "text-status-assigned", bgColor: "bg-status-assigned/10" },
  auto_responded: { label: "Auto", color: "text-status-auto", bgColor: "bg-status-auto/10" },
  resolved: { label: "Resolved", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  escalated: { label: "Escalated", color: "text-status-escalated", bgColor: "bg-status-escalated/10" },
};

export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; icon: string }> = {
  text: { label: "Short Text", icon: "Type" },
  textarea: { label: "Long Text", icon: "AlignLeft" },
  radio: { label: "Single Choice", icon: "CircleDot" },
  checkbox: { label: "Multiple Choice", icon: "CheckSquare" },
  date: { label: "Date", icon: "Calendar" },
  dropdown: { label: "Dropdown", icon: "ChevronDown" },
  number: { label: "Number", icon: "Hash" },
};

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bgColor: string }> = {
  incomplete: { label: "Incomplete", color: "text-status-pending", bgColor: "bg-status-pending/10" },
  complete: { label: "Complete", color: "text-primary", bgColor: "bg-primary/10" },
  submitted: { label: "Submitted", color: "text-status-assigned", bgColor: "bg-status-assigned/10" },
  approved: { label: "Approved", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  needs_revision: { label: "Needs Revision", color: "text-status-escalated", bgColor: "bg-status-escalated/10" },
};

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending Review", color: "text-status-pending", bgColor: "bg-status-pending/10" },
  approved: { label: "Approved", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  needs_revision: { label: "Needs Revision", color: "text-status-escalated", bgColor: "bg-status-escalated/10" },
};

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground", bgColor: "bg-muted" },
  scheduled: { label: "Scheduled", color: "text-status-assigned", bgColor: "bg-status-assigned/10" },
  sending: { label: "Sending", color: "text-status-auto", bgColor: "bg-status-auto/10" },
  sent: { label: "Sent", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  paused: { label: "Paused", color: "text-status-pending", bgColor: "bg-status-pending/10" },
};

export const TEMPLATE_CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  welcome: { label: "Welcome", color: "text-category-health" },
  followup: { label: "Follow-up", color: "text-category-scheduling" },
  promotional: { label: "Promotional", color: "text-category-billing" },
  educational: { label: "Educational", color: "text-primary" },
  reactivation: { label: "Reactivation", color: "text-category-prescription" },
};
