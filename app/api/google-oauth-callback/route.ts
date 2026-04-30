import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set" },
      { status: 500 }
    );
  }

  try {
    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) {
      return NextResponse.json({ error: "Missing required fields: code, redirect_uri" }, { status: 400 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri, grant_type: "authorization_code" }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json({ error: "Token exchange failed", detail: err }, { status: 400 });
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const tokenPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokens.scope,
    };

    const scopes = tokens.scope ?? "";
    const hasCalendar = scopes.includes("calendar");
    const hasGmail = scopes.includes("gmail");

    const updates: Record<string, unknown> = {};
    if (hasCalendar) updates.google_calendar_token = tokenPayload;
    if (hasGmail) updates.google_gmail_token = tokenPayload;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No recognized Google scopes were granted" }, { status: 400 });
    }

    const sb = serverClient();
    // Get existing row or create default one
    let { data: settingsRow } = await sb
      .from("practice_settings")
      .select("id")
      .limit(1)
      .single();

    if (!settingsRow) {
      // Create default row
      const { data: newRow, error: insertErr } = await sb
        .from("practice_settings")
        .insert({ practice_name: "FitLogic Practice" })
        .select("id")
        .single();
      if (insertErr) {
        return NextResponse.json({ error: "Failed to create practice_settings: " + insertErr.message }, { status: 500 });
      }
      settingsRow = newRow;
    }

    const { error: updateErr } = await sb
      .from("practice_settings")
      .update(updates as any)
      .eq("id", settingsRow.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true, connected: { calendar: hasCalendar, gmail: hasGmail } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
