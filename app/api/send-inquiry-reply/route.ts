import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";
import { sendEmail, wrapEmailHtml, sanitizeEmailHtml } from "@/lib/emailSender";
import { applyEmailVars } from "@/lib/email-vars";

export async function POST(req: NextRequest) {
  try {
    const { inquiry_id, reply_text, html_content, variables, attachments } = await req.json();
    if (!inquiry_id || !reply_text?.trim()) {
      return NextResponse.json({ error: "inquiry_id and reply_text required" }, { status: 400 });
    }

    const sb = serverClient();

    const { data: inquiry, error: iqErr } = await sb
      .from("inquiries")
      .select("id, patient_name, patient_email, raw_content")
      .eq("id", inquiry_id)
      .single();
    if (iqErr || !inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    if (!inquiry.patient_email) return NextResponse.json({ error: "No email address for this sender" }, { status: 400 });

    const { data: settings } = await sb
      .from("practice_settings")
      .select("email_provider_api_key, email_from_address, email_from_name, google_gmail_token")
      .limit(1)
      .single();

    const resendApiKey: string = process.env.RESEND_API_KEY ?? settings?.email_provider_api_key ?? "";
    const fromAddress: string = process.env.FROM_EMAIL ?? settings?.email_from_address ?? "";
    const fromName: string = settings?.email_from_name ?? "FitLogic";
    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const hasGmail = !!settings?.google_gmail_token;

    if (!resendApiKey && !hasGmail) {
      return NextResponse.json({ error: "Email provider not configured" }, { status: 500 });
    }

    const processedReplyText = applyEmailVars(reply_text, variables);
    const rawBody = html_content
      ? applyEmailVars(html_content, variables)
      : `<p>${processedReplyText.replace(/\n/g, "<br>")}</p>`;
    const signature = `<p style="margin-top:24px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;">
  Fit Logic · <a href="mailto:${fromAddress}" style="color:#888;">${fromAddress}</a>
</p>`;
    const safeBody = sanitizeEmailHtml(rawBody + signature);
    const fullHtml = wrapEmailHtml({ bodyFragment: safeBody });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const result = await sendEmail(
      resendApiKey,
      {
        to: inquiry.patient_email,
        toName: inquiry.patient_name ?? null,
        subject: "Re: Your message to Fit Logic",
        html: fullHtml,
        from: fromHeader || undefined,
        attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
      },
      baseUrl,
      hasGmail,
    );

    if (!result.success) {
      return NextResponse.json({ error: `Email send failed: ${result.error}` }, { status: 502 });
    }

    await sb
      .from("inquiries")
      .update({
        response_text: processedReplyText,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", inquiry_id);

    return NextResponse.json({ success: true, provider: result.provider });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
