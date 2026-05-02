import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";
import { sendEmail, wrapEmailHtml, sanitizeEmailHtml } from "@/lib/emailSender";

interface SendEmailAttachment {
  filename: string;
  /** Base64-encoded content, no data: URL prefix. */
  content: string;
  mimeType: string;
}

interface SendEmailRequest {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  /** Replaces {{key}} tokens in subject/html before sending. */
  variables?: Record<string, string | number | null | undefined>;
  attachments?: SendEmailAttachment[];
}

function replaceVariables(
  template: string,
  variables?: Record<string, string | number | null | undefined>,
): string {
  if (!variables) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value != null ? String(value) : match;
  });
}

/**
 * One-off email send used by the Compose dialog in Patients.
 * Tries Resend first; falls back to Gmail (per-user OAuth) only if Resend fails
 * AND the practice has connected a Gmail account in Settings.
 */
export async function POST(req: NextRequest) {
  const sb = serverClient();

  try {
    const body = (await req.json()) as SendEmailRequest;
    const { to, toName, subject, html, variables, attachments } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 },
      );
    }

    const { data: settings } = await sb
      .from("practice_settings")
      .select(
        "email_provider_api_key, email_from_address, email_from_name, google_gmail_token",
      )
      .limit(1)
      .single();

    const resendApiKey: string =
      process.env.RESEND_API_KEY ?? settings?.email_provider_api_key ?? "";
    const fromAddress = process.env.FROM_EMAIL ?? settings?.email_from_address ?? "";
    const fromName = settings?.email_from_name ?? "FitLogic";
    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const hasGmail = !!(settings as unknown as { google_gmail_token?: unknown })
      ?.google_gmail_token;

    if (!resendApiKey && !hasGmail) {
      return NextResponse.json(
        { error: "No email provider configured. Connect Resend or Gmail in Settings." },
        { status: 400 },
      );
    }

    const processedSubject = replaceVariables(subject, variables);
    const processedBody = sanitizeEmailHtml(replaceVariables(html, variables));
    const wrappedHtml = wrapEmailHtml({ bodyFragment: processedBody });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

    const result = await sendEmail(
      resendApiKey,
      {
        to,
        toName: toName ?? null,
        subject: processedSubject,
        html: wrappedHtml,
        from: fromHeader || undefined,
        attachments: attachments?.length ? attachments : undefined,
      },
      baseUrl,
      hasGmail,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Send failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
    });
  } catch (err) {
    console.error("send-email error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
