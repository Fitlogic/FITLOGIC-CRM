import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, segments, mode, emailCount } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const segmentContext = segments?.length
      ? `Available audience segments: ${segments.map((s: any) => `"${s.name}" (${s.estimatedCount} recipients, ${s.description})`).join(", ")}`
      : "";

    const isSequence = mode === "sequence" || (emailCount && emailCount > 1);
    const count = emailCount || 3;

    const systemPrompt = isSequence
      ? `You are a cold email and marketing campaign expert for a business CRM platform.
Generate a complete multi-email sequence based on the user's request.

${segmentContext}

You MUST use the generate_sequence tool to return your response.
Generate ${count} emails following cold email best practices:
- Email 1: Introduction and value proposition. Short, personal, ask one question.
- Email 2: Follow up referencing email 1. Add social proof or case study. Wait 2-3 days.
- Email 3: Different angle, share insight or resource. Wait 3-4 days.
- Email 4 (if needed): Create urgency or time-sensitive offer. Wait 4-5 days.
- Email 5 (if needed): Break-up email, last chance. Often gets highest reply rate. Wait 5-7 days.

Keep subject lines 6-10 words. Body should be well-formatted HTML with inline styles.
Use warm, professional tone. Include clear calls-to-action.
Suggest optimal timing and best matching audience segment.`
      : `You are a marketing campaign strategist for a business CRM platform.
Generate a complete email campaign based on the user's request.

${segmentContext}

You MUST use the generate_campaign tool to return your response. Generate compelling, professional marketing content.
- Subject lines should be 6-10 words, attention-grabbing but professional
- Email body should be well-formatted HTML with inline styles
- Use warm, empowering tone appropriate for the business
- Include a clear call-to-action
- Suggest the best matching segment from the available ones
- Suggest optimal send timing based on the campaign type`;

    const tools = isSequence
      ? [{
          type: "function",
          function: {
            name: "generate_sequence",
            description: "Generate a complete multi-email campaign sequence",
            parameters: {
              type: "object",
              properties: {
                campaignName: { type: "string", description: "Short campaign name (3-6 words)" },
                category: { type: "string", enum: ["welcome", "followup", "promotional", "educational", "reactivation"] },
                suggestedSegment: { type: "string", description: "Name of the best matching segment" },
                sendTimeRecommendation: { type: "string", description: "When to start sending (e.g., 'Tuesday 10am')" },
                rationale: { type: "string", description: "Brief explanation of strategy (2-3 sentences)" },
                emails: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step: { type: "number" },
                      subject: { type: "string" },
                      previewText: { type: "string", description: "Under 100 chars" },
                      bodyHtml: { type: "string", description: "Full email HTML with inline styles" },
                      delayDays: { type: "number", description: "Days to wait after previous email (0 for first)" },
                      tip: { type: "string", description: "Brief best-practice tip for this step" },
                    },
                    required: ["step", "subject", "previewText", "bodyHtml", "delayDays", "tip"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["campaignName", "category", "suggestedSegment", "sendTimeRecommendation", "rationale", "emails"],
              additionalProperties: false,
            },
          },
        }]
      : [{
          type: "function",
          function: {
            name: "generate_campaign",
            description: "Generate a complete email campaign with all required fields",
            parameters: {
              type: "object",
              properties: {
                campaignName: { type: "string", description: "Short campaign name (3-6 words)" },
                subject: { type: "string", description: "Email subject line" },
                previewText: { type: "string", description: "Email preview text shown in inbox (under 100 chars)" },
                bodyHtml: { type: "string", description: "Full email body as clean HTML with inline styles. Use professional layout." },
                category: { type: "string", enum: ["welcome", "followup", "promotional", "educational", "reactivation"] },
                suggestedSegment: { type: "string", description: "Name of the best matching segment" },
                sendTimeRecommendation: { type: "string", description: "When to send (e.g., 'Tuesday 10am')" },
                rationale: { type: "string", description: "Brief explanation of strategy choices (2-3 sentences)" },
              },
              required: ["campaignName", "subject", "previewText", "bodyHtml", "category", "suggestedSegment", "sendTimeRecommendation", "rationale"],
              additionalProperties: false,
            },
          },
        }];

    const toolChoice = isSequence
      ? { type: "function", function: { name: "generate_sequence" } }
      : { type: "function", function: { name: "generate_campaign" } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not generate a valid campaign" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaign = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(campaign), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
