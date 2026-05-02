import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";

// Fail fast — pixel renders inline in the recipient's email client, so a
// hung Supabase connection here would block image rendering and tip off
// recipients that we're tracking. Cap at 5s.
export const maxDuration = 5;
// Disable Next.js function caching — every open is a unique event.
export const dynamic = "force-dynamic";

const PIXEL = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489000000" +
  "0a4944415478" + "9c620000000200" + "01e527defc00000000" + "49454e44ae426082",
  "hex"
);

// Hostnames we refuse to redirect to even with a valid http(s) protocol —
// closes the open-redirect vector that lets a forged tracking URL bounce a
// recipient onto an internal service or a localhost dev tool.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,                 // link-local
  /^::1$/,                       // IPv6 loopback
  /^fe80:/i,                     // IPv6 link-local
  /^fc00:/i, /^fd00:/i,          // IPv6 unique-local
  /^0\.0\.0\.0$/,
];

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.replace(/^\[|\]$/g, ""); // strip [] from IPv6
    if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return false;
    return true;
  } catch {
    return false;
  }
}

function pixelResponse() {
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const action = url.searchParams.get("a") || "open";
  const rawRedirect = url.searchParams.get("url");

  if (!trackingId) {
    return new NextResponse("Missing tracking ID", { status: 400 });
  }

  const sb = serverClient();

  try {
    const now = new Date().toISOString();

    if (action === "open") {
      await sb
        .from("campaign_send_log")
        .update({ opened_at: now, status: "opened" })
        .eq("tracking_id", trackingId)
        .is("opened_at", null);

      const { data: log } = await sb
        .from("campaign_send_log")
        .select("recipient_id")
        .eq("tracking_id", trackingId)
        .single();

      if (log?.recipient_id) {
        await sb
          .from("campaign_recipients")
          .update({ opened_at: now })
          .eq("id", log.recipient_id)
          .is("opened_at", null);
      }

      return pixelResponse();
    }

    if (action === "click") {
      await sb
        .from("campaign_send_log")
        .update({ clicked_at: now, status: "clicked" })
        .eq("tracking_id", trackingId)
        .is("clicked_at", null);

      const { data: log } = await sb
        .from("campaign_send_log")
        .select("recipient_id")
        .eq("tracking_id", trackingId)
        .single();

      if (log?.recipient_id) {
        await sb
          .from("campaign_recipients")
          .update({ clicked_at: now })
          .eq("id", log.recipient_id)
          .is("clicked_at", null);
      }

      const destination = rawRedirect && isSafeUrl(rawRedirect) ? rawRedirect : null;
      if (destination) {
        return NextResponse.redirect(destination, { status: 302 });
      }

      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("track-email error:", error);
    if (action === "open") return pixelResponse();
    if (action === "click" && rawRedirect && isSafeUrl(rawRedirect)) {
      return NextResponse.redirect(rawRedirect, { status: 302 });
    }
    return new NextResponse("Error", { status: 500 });
  }
}
