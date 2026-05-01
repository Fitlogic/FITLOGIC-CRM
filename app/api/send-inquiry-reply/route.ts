import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

// Replace template variables like {{first_name}} with actual values
function replaceVariables(
  template: string,
  variables?: Record<string, string | number | null | undefined>
): string {
  if (!variables) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value != null ? String(value) : match;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { inquiry_id, reply_text, html_content, variables } = await req.json();
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

    const fromAddress: string = process.env.FROM_EMAIL ?? settings?.email_from_address ?? "";
    const fromName: string = settings?.email_from_name ?? "FitLogic";

    // Use Gmail API if connected, otherwise fall back to Resend
    const hasGmail = !!settings?.google_gmail_token;
    // Apply variable replacement
    const processedReplyText = replaceVariables(reply_text, variables);
    const html = html_content ? replaceVariables(html_content, variables) : `<p>${processedReplyText.replace(/\n/g, "<br>")}</p>`;
    const signature = `<p style="margin-top:24px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;">
  Fit Logic · <a href="mailto:${fromAddress}" style="color:#888;">${fromAddress}</a>
</p>`;
    const fullHtml = html + signature;

    if (hasGmail) {
      // Use send-gmail endpoint
      const sendRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000"}/api/send-gmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inquiry.patient_email,
          toName: inquiry.patient_name,
          subject: `Re: Your message to Fit Logic`,
          html: fullHtml,
        }),
      });

      if (!sendRes.ok) {
        const errData = await sendRes.json().catch(() => ({ error: "Unknown error" }));
        return NextResponse.json({ error: `Gmail send failed: ${errData.error}` }, { status: 502 });
      }
    } else {
      // Fall back to Resend
      const emailApiKey: string = process.env.RESEND_API_KEY ?? settings?.email_provider_api_key ?? "";
      if (!emailApiKey || !fromAddress) {
        return NextResponse.json({ error: "Email provider not configured" }, { status: 500 });
      }

      const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${emailApiKey}` },
        body: JSON.stringify({
          from: fromHeader,
          to: [inquiry.patient_email],
          subject: `Re: Your message to Fit Logic`,
          html: fullHtml,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Email send failed: ${errText}` }, { status: 502 });
      }
    }

    const updates = {
      response_text: processedReplyText,
      status: "resolved",
      resolved_at: new Date().toISOString(),
    };
    await sb.from("inquiries").update(updates).eq("id", inquiry_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
