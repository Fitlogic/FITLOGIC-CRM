import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 1x1 transparent PNG pixel
const PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const action = url.searchParams.get("a") || "open";
  const redirectUrl = url.searchParams.get("url");

  if (!trackingId) {
    return new Response("Missing tracking ID", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const now = new Date().toISOString();

    if (action === "open") {
      // Update send log
      await supabase
        .from("campaign_send_log")
        .update({ opened_at: now })
        .eq("tracking_id", trackingId)
        .is("opened_at", null);

      // Also update recipient record
      const { data: log } = await supabase
        .from("campaign_send_log")
        .select("recipient_id")
        .eq("tracking_id", trackingId)
        .single();

      if (log?.recipient_id) {
        await supabase
          .from("campaign_recipients")
          .update({ opened_at: now })
          .eq("id", log.recipient_id)
          .is("opened_at", null);
      }

      // Return tracking pixel
      return new Response(PIXEL, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (action === "click" && redirectUrl) {
      // Update send log
      await supabase
        .from("campaign_send_log")
        .update({ clicked_at: now })
        .eq("tracking_id", trackingId)
        .is("clicked_at", null);

      // Also update recipient record
      const { data: log } = await supabase
        .from("campaign_send_log")
        .select("recipient_id")
        .eq("tracking_id", trackingId)
        .single();

      if (log?.recipient_id) {
        await supabase
          .from("campaign_recipients")
          .update({ clicked_at: now })
          .eq("id", log.recipient_id)
          .is("clicked_at", null);
      }

      // Redirect to actual URL
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("track-email error:", error);
    // Still return pixel/redirect on error to not break user experience
    if (action === "open") {
      return new Response(PIXEL, { headers: { "Content-Type": "image/png" } });
    }
    if (action === "click" && redirectUrl) {
      return new Response(null, { status: 302, headers: { Location: redirectUrl } });
    }
    return new Response("Error", { status: 500 });
  }
});
