export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
  category: "welcome" | "followup" | "promotional" | "educational" | "reactivation";
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  estimatedCount: number;
  color: string;
}

export interface SegmentRule {
  field: string;
  operator: "is" | "is_not" | "contains" | "greater_than" | "less_than" | "before" | "after";
  value: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  templateId: string;
  segmentId: string;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: CampaignStats | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export const TEMPLATES: EmailTemplate[] = [
  {
    id: "t1",
    name: "New Patient Welcome",
    subject: "Welcome to FitLogic — Here's What to Expect",
    previewText: "We're glad you're here. Here's how to get started.",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #0e9aa7;">Welcome to FitLogic!</h1>
<p>Hi {{first_name}},</p>
<p>Thank you for choosing FitLogic for your functional medicine journey. We're excited to partner with you on your path to optimal health.</p>
<h3>What's Next?</h3>
<ul>
<li>Complete your <strong>intake form</strong> — we'll send a link shortly</li>
<li>Schedule your <strong>initial consultation</strong> (60 min, $150)</li>
<li>Gather any recent <strong>lab results</strong> to bring to your visit</li>
</ul>
<p>Questions? Simply reply to this email or call us at (555) 123-4567.</p>
<p>— The FitLogic Team</p>
</div>`,
    category: "welcome",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "t2",
    name: "Lab Results Ready",
    subject: "Your Lab Results Are In",
    previewText: "Your recent lab work has been reviewed.",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #0e9aa7;">Your Lab Results</h1>
<p>Hi {{first_name}},</p>
<p>Your lab results from {{lab_date}} have been reviewed by Dr. Megan. Here's a summary:</p>
<div style="background: #f0fafa; padding: 16px; border-radius: 8px; margin: 16px 0;">
<p style="margin: 0;"><strong>Status:</strong> {{result_status}}</p>
</div>
<p>We'd love to walk you through the details. <a href="{{booking_link}}" style="color: #0e9aa7;">Schedule a follow-up</a> to discuss your results.</p>
<p>— The FitLogic Team</p>
</div>`,
    category: "followup",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "t3",
    name: "Hormone Program Launch",
    subject: "New Group Program: Hormone Optimization",
    previewText: "Limited spots available for our spring cohort.",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #0e9aa7;">Hormone Optimization Program</h1>
<p>Hi {{first_name}},</p>
<p>We're launching our <strong>8-week Hormone Optimization Program</strong> starting March 15!</p>
<h3>What's Included:</h3>
<ul>
<li>Comprehensive hormone panel testing</li>
<li>Weekly group sessions with Dr. Megan</li>
<li>Personalized supplement protocols</li>
<li>Private community access</li>
</ul>
<p><strong>Early bird pricing:</strong> $497 (regular $697)</p>
<p><a href="{{signup_link}}" style="background: #0e9aa7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Reserve Your Spot</a></p>
<p>Only 12 spots available. Reply with questions!</p>
</div>`,
    category: "promotional",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "t4",
    name: "Monthly Health Tips",
    subject: "{{month}} Health Tips from FitLogic",
    previewText: "Simple steps for better health this month.",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #0e9aa7;">{{month}} Health Tips</h1>
<p>Hi {{first_name}},</p>
<p>Here are our top health tips for {{month}}:</p>
<h3>🥗 Nutrition</h3>
<p>{{nutrition_tip}}</p>
<h3>🏃 Movement</h3>
<p>{{movement_tip}}</p>
<h3>😴 Recovery</h3>
<p>{{recovery_tip}}</p>
<p>Want personalized guidance? <a href="{{booking_link}}" style="color: #0e9aa7;">Book a session</a>.</p>
</div>`,
    category: "educational",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "t5",
    name: "We Miss You",
    subject: "It's been a while — let's reconnect",
    previewText: "We'd love to see you back at FitLogic.",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h1 style="color: #0e9aa7;">We Miss You!</h1>
<p>Hi {{first_name}},</p>
<p>It's been {{months_away}} months since your last visit. We'd love to check in on your progress.</p>
<p>As a welcome-back offer, enjoy <strong>20% off</strong> your next consultation.</p>
<p><a href="{{booking_link}}" style="background: #0e9aa7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Book Now — 20% Off</a></p>
<p>Use code: <strong>WELCOMEBACK</strong></p>
</div>`,
    category: "reactivation",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const SEGMENTS: Segment[] = [
  {
    id: "seg1",
    name: "All Active Patients",
    description: "Patients with a visit in the last 6 months",
    rules: [{ field: "last_visit", operator: "after", value: "6_months_ago" }],
    estimatedCount: 142,
    color: "primary",
  },
  {
    id: "seg2",
    name: "New Patients (30 days)",
    description: "Patients who joined in the last 30 days",
    rules: [{ field: "created_at", operator: "after", value: "30_days_ago" }],
    estimatedCount: 18,
    color: "category-health",
  },
  {
    id: "seg3",
    name: "Lapsed Patients",
    description: "No visit in 6+ months",
    rules: [{ field: "last_visit", operator: "before", value: "6_months_ago" }],
    estimatedCount: 47,
    color: "status-pending",
  },
  {
    id: "seg4",
    name: "Hormone Program Interest",
    description: "Patients who expressed interest in hormone optimization",
    rules: [{ field: "tags", operator: "contains", value: "hormone_interest" }],
    estimatedCount: 23,
    color: "category-prescription",
  },
  {
    id: "seg5",
    name: "Insurance Inquirers",
    description: "Patients who asked about insurance/billing",
    rules: [{ field: "inquiry_category", operator: "is", value: "Billing_Insurance" }],
    estimatedCount: 31,
    color: "category-billing",
  },
];

export const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Spring Hormone Program Launch",
    status: "sent",
    templateId: "t3",
    segmentId: "seg1",
    scheduledAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    sentAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    stats: { sent: 142, delivered: 138, opened: 67, clicked: 23, bounced: 4, unsubscribed: 1 },
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "c2",
    name: "March Health Tips Newsletter",
    status: "scheduled",
    templateId: "t4",
    segmentId: "seg1",
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    sentAt: null,
    stats: null,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "c3",
    name: "Welcome Series — New Patients",
    status: "sending",
    templateId: "t1",
    segmentId: "seg2",
    scheduledAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    stats: { sent: 12, delivered: 12, opened: 5, clicked: 3, bounced: 0, unsubscribed: 0 },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "c4",
    name: "Re-engagement — Lapsed Patients",
    status: "draft",
    templateId: "t5",
    segmentId: "seg3",
    scheduledAt: null,
    sentAt: null,
    stats: null,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "c5",
    name: "Lab Results Follow-up Batch",
    status: "sent",
    templateId: "t2",
    segmentId: "seg1",
    scheduledAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    sentAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    stats: { sent: 34, delivered: 33, opened: 28, clicked: 19, bounced: 1, unsubscribed: 0 },
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground", bgColor: "bg-muted" },
  scheduled: { label: "Scheduled", color: "text-status-assigned", bgColor: "bg-status-assigned/10" },
  sending: { label: "Sending", color: "text-status-auto", bgColor: "bg-status-auto/10" },
  sent: { label: "Sent", color: "text-status-resolved", bgColor: "bg-status-resolved/10" },
  paused: { label: "Paused", color: "text-status-pending", bgColor: "bg-status-pending/10" },
};

export const TEMPLATE_CATEGORY_CONFIG: Record<EmailTemplate["category"], { label: string; color: string }> = {
  welcome: { label: "Welcome", color: "text-category-health" },
  followup: { label: "Follow-up", color: "text-category-scheduling" },
  promotional: { label: "Promotional", color: "text-category-billing" },
  educational: { label: "Educational", color: "text-primary" },
  reactivation: { label: "Reactivation", color: "text-category-prescription" },
};
