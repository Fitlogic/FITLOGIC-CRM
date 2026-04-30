import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

interface GmailToken {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
}

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  mimeType: string;
}

interface SendEmailRequest {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

async function getValidAccessToken(token: GmailToken): Promise<string | null> {
  const expiresAt = new Date(token.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return token.access_token;
  if (!token.refresh_token) return null;

  // Refresh the token
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) return null;
  const data = await refreshRes.json();
  return data.access_token ?? null;
}

// Build RFC 2822 email message with MIME parts
function buildMimeMessage(
  from: string,
  fromName: string,
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  attachments?: EmailAttachment[]
): string {
  const boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;
  const now = new Date();
  
  // Encode subject for non-ASCII characters
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  
  let mimeMessage = `From: ${fromName} <${from}>
To: ${toName} <${to}>
Subject: ${encodedSubject}
Date: ${now.toUTCString()}
MIME-Version: 1.0
`;

  if (attachments && attachments.length > 0) {
    // Mixed multipart for attachments
    mimeMessage += `Content-Type: multipart/mixed; boundary="${boundary}"

This is a multi-part message in MIME format.
--${boundary}
`;
    
    // Add alternative text/html body
    if (textBody) {
      mimeMessage += `Content-Type: multipart/alternative; boundary="${boundary}_alt"

--${boundary}_alt
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${textBody}

--${boundary}_alt
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${htmlBody}

--${boundary}_alt--
`;
    } else {
      mimeMessage += `Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${htmlBody}
`;
    }

    // Add attachments
    for (const attachment of attachments) {
      mimeMessage += `
--${boundary}
Content-Type: ${attachment.mimeType}; name="${attachment.filename}"
Content-Disposition: attachment; filename="${attachment.filename}"
Content-Transfer-Encoding: base64

${attachment.content.match(/.{1,76}/g)?.join("\n") || attachment.content}
`;
    }

    mimeMessage += `
--${boundary}--
`;
  } else {
    // No attachments - use alternative for text/html
    if (textBody) {
      mimeMessage += `Content-Type: multipart/alternative; boundary="${boundary}"

This is a multi-part message in MIME format.
--${boundary}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${textBody}

--${boundary}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${htmlBody}

--${boundary}--
`;
    } else {
      mimeMessage += `Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

${htmlBody}
`;
    }
  }

  return mimeMessage;
}

// Convert HTML to plain text for email clients that don't support HTML
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function POST(req: Request) {
  const sb = serverClient();

  try {
    const body = await req.json() as SendEmailRequest;
    const { to, toName, subject, html, attachments } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    // Get Gmail credentials from settings
    const { data: settings } = await sb
      .from("practice_settings")
      .select("google_gmail_token, email_from_address, email_from_name")
      .limit(1)
      .single();

    const rawToken = settings?.google_gmail_token as GmailToken | null;
    if (!rawToken?.access_token) {
      return NextResponse.json(
        { error: "Gmail not connected" },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(rawToken);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Gmail token expired and could not be refreshed" },
        { status: 401 }
      );
    }

    const fromAddress = settings?.email_from_address || "noreply@example.com";
    const fromName = settings?.email_from_name || "FitLogic";

    // Build the MIME message
    const textBody = htmlToText(html);
    const mimeMessage = buildMimeMessage(
      fromAddress,
      fromName,
      to,
      toName || to.split("@")[0],
      subject,
      html,
      textBody,
      attachments
    );

    // Encode for Gmail API (base64url)
    const encodedMessage = Buffer.from(mimeMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    if (!sendRes.ok) {
      const error = await sendRes.text();
      console.error("Gmail send error:", error);
      return NextResponse.json(
        { error: `Failed to send email: ${error}` },
        { status: 502 }
      );
    }

    const result = await sendRes.json();

    // Log the sent email to inquiries for tracking
    await sb.from("inquiries").insert({
      source: "gmail_sent",
      source_id: result.id,
      patient_email: to,
      patient_name: toName || to,
      raw_content: `Subject: ${subject}\n\n${html}`,
      status: "resolved",
      category: "Sent_Email",
    } as any);

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (err) {
    console.error("send-gmail error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
