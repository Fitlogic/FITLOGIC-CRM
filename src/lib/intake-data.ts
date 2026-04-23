// Intake Forms data models & mock data

export type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "date" | "dropdown" | "number";

export interface FormQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[]; // for radio, checkbox, dropdown
  placeholder?: string;
}

export interface IntakeForm {
  id: string;
  name: string;
  description: string;
  questions: FormQuestion[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
}

export type SubmissionStatus = "incomplete" | "complete" | "submitted" | "approved" | "needs_revision";
export type ReviewStatus = "pending" | "approved" | "needs_revision";

export interface FormSubmission {
  id: string;
  formId: string;
  patientName: string;
  patientEmail: string;
  submissionData: Record<string, string | string[]>;
  completionStatus: SubmissionStatus;
  submittedAt: string | null;
  reviewStatus: ReviewStatus;
  staffNotes: string | null;
}

// ── Question type config ──
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

// ── Mock Forms ──
export const INTAKE_FORMS: IntakeForm[] = [
  {
    id: "form-1",
    name: "New Patient Intake",
    description: "Complete health history and lifestyle assessment for first-time patients",
    questions: [
      { id: "q1", label: "Full Name", type: "text", required: true, placeholder: "First and last name" },
      { id: "q2", label: "Date of Birth", type: "date", required: true },
      { id: "q3", label: "Email Address", type: "text", required: true, placeholder: "your@email.com" },
      { id: "q4", label: "Phone Number", type: "text", required: true, placeholder: "(555) 000-0000" },
      { id: "q5", label: "What is your primary health concern?", type: "textarea", required: true, helpText: "Please describe your main reason for visiting us today." },
      { id: "q6", label: "Health Focus Areas", type: "checkbox", required: true, options: ["Hormone Optimization", "Digestive Health", "Energy & Fatigue", "Weight Management", "Immune Support", "Mental Clarity", "Sleep Issues", "Stress Management"] },
      { id: "q7", label: "Current Medications", type: "textarea", required: false, helpText: "List all current medications and supplements, including dosages." },
      { id: "q8", label: "Known Allergies", type: "textarea", required: false, placeholder: "List any allergies to medications, food, or environmental factors" },
      { id: "q9", label: "How did you hear about us?", type: "dropdown", required: true, options: ["Referral from a friend/family", "Google Search", "Social Media", "Doctor Referral", "Insurance Provider", "Other"] },
      { id: "q10", label: "Rate your overall energy level (1-10)", type: "number", required: true, helpText: "1 = very low, 10 = excellent" },
    ],
    active: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    submissionCount: 24,
  },
  {
    id: "form-2",
    name: "Follow-Up Visit Questionnaire",
    description: "Progress check-in for returning patients",
    questions: [
      { id: "q1", label: "Full Name", type: "text", required: true },
      { id: "q2", label: "How are you feeling since your last visit?", type: "radio", required: true, options: ["Much better", "Somewhat better", "About the same", "Somewhat worse", "Much worse"] },
      { id: "q3", label: "Have you experienced any new symptoms?", type: "radio", required: true, options: ["Yes", "No"] },
      { id: "q4", label: "If yes, please describe new symptoms", type: "textarea", required: false },
      { id: "q5", label: "Are you taking all prescribed supplements/medications as directed?", type: "radio", required: true, options: ["Yes, all of them", "Most of them", "Some of them", "No"] },
      { id: "q6", label: "Any changes to your diet or lifestyle since last visit?", type: "textarea", required: false, helpText: "Exercise, sleep, stress levels, diet changes, etc." },
    ],
    active: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    submissionCount: 18,
  },
  {
    id: "form-3",
    name: "Hormone Reset Program Application",
    description: "Pre-screening questionnaire for the group hormone optimization program",
    questions: [
      { id: "q1", label: "Full Name", type: "text", required: true },
      { id: "q2", label: "Age", type: "number", required: true },
      { id: "q3", label: "Gender", type: "radio", required: true, options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
      { id: "q4", label: "Have you had hormone levels tested in the past 12 months?", type: "radio", required: true, options: ["Yes", "No", "Not sure"] },
      { id: "q5", label: "Which symptoms are you experiencing?", type: "checkbox", required: true, options: ["Fatigue", "Weight gain", "Mood changes", "Hot flashes", "Low libido", "Brain fog", "Hair loss", "Insomnia"] },
      { id: "q6", label: "What is your primary goal for joining this program?", type: "textarea", required: true },
      { id: "q7", label: "Preferred program start date", type: "date", required: true },
    ],
    active: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    submissionCount: 7,
  },
];

// ── Mock Submissions ──
export const FORM_SUBMISSIONS: FormSubmission[] = [
  {
    id: "sub-1",
    formId: "form-1",
    patientName: "Emily Carter",
    patientEmail: "emily.c@email.com",
    submissionData: {
      q1: "Emily Carter",
      q2: "1988-06-15",
      q3: "emily.c@email.com",
      q4: "(555) 234-5678",
      q5: "I've been experiencing chronic fatigue and brain fog for about 6 months. My energy crashes hard around 2-3pm every day.",
      q6: ["Energy & Fatigue", "Mental Clarity", "Hormone Optimization"],
      q7: "Vitamin D3 5000IU, Magnesium Glycinate 400mg",
      q8: "Penicillin",
      q9: "Referral from a friend/family",
      q10: "3",
    },
    completionStatus: "submitted",
    submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    reviewStatus: "pending",
    staffNotes: null,
  },
  {
    id: "sub-2",
    formId: "form-1",
    patientName: "David Park",
    patientEmail: "david.p@email.com",
    submissionData: {
      q1: "David Park",
      q2: "1975-11-03",
      q3: "david.p@email.com",
      q4: "(555) 876-5432",
      q5: "Digestive issues - bloating after meals, occasional acid reflux. Tried OTC antacids with limited relief.",
      q6: ["Digestive Health", "Weight Management"],
      q7: "Omeprazole 20mg, Fish Oil 1000mg",
      q8: "None known",
      q9: "Google Search",
      q10: "5",
    },
    completionStatus: "submitted",
    submittedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    reviewStatus: "approved",
    staffNotes: "Good candidate. Scheduled for initial consult next Tuesday.",
  },
  {
    id: "sub-3",
    formId: "form-2",
    patientName: "Sarah Jenkins",
    patientEmail: "sarah.j@email.com",
    submissionData: {
      q1: "Sarah Jenkins",
      q2: "Much better",
      q3: "No",
      q4: "",
      q5: "Yes, all of them",
      q6: "Started yoga 3x/week, sleeping better. Reduced sugar intake significantly.",
    },
    completionStatus: "submitted",
    submittedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    reviewStatus: "approved",
    staffNotes: "Great progress. Continue current protocol.",
  },
  {
    id: "sub-4",
    formId: "form-1",
    patientName: "Rachel Torres",
    patientEmail: "rachel.t@email.com",
    submissionData: {
      q1: "Rachel Torres",
      q2: "1992-03-20",
      q3: "rachel.t@email.com",
      q4: "(555) 111-2233",
      q5: "Insomnia and anxiety. Can't fall asleep, averaging 4-5 hours a night.",
      q6: ["Sleep Issues", "Stress Management"],
      q7: "",
      q8: "",
      q9: "Social Media",
      q10: "4",
    },
    completionStatus: "submitted",
    submittedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    reviewStatus: "needs_revision",
    staffNotes: "Missing medication and allergy info. Requested patient to update.",
  },
  {
    id: "sub-5",
    formId: "form-3",
    patientName: "Linda Nguyen",
    patientEmail: "linda.n@email.com",
    submissionData: {
      q1: "Linda Nguyen",
      q2: "47",
      q3: "Female",
      q4: "Yes",
      q5: ["Fatigue", "Hot flashes", "Mood changes", "Insomnia"],
      q6: "I want to feel like myself again. The mood swings and hot flashes are affecting my work and relationships.",
      q7: "2025-04-01",
    },
    completionStatus: "submitted",
    submittedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    reviewStatus: "pending",
    staffNotes: null,
  },
  {
    id: "sub-6",
    formId: "form-1",
    patientName: "Jason Blake",
    patientEmail: "jason.b@email.com",
    submissionData: {
      q1: "Jason Blake",
      q2: "1980-09-12",
      q3: "jason.b@email.com",
      q4: "",
      q5: "",
      q6: [],
    },
    completionStatus: "incomplete",
    submittedAt: null,
    reviewStatus: "pending",
    staffNotes: null,
  },
];
