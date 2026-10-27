import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AVAILABLE_WIDGETS = [
  { id: "tree_type_chart", name: "Tree Species Breakdown", description: "Pie or bar chart showing distribution of tree types planted", size: "medium" },
  { id: "health_overview", name: "Health Overview", description: "Summary cards showing health score distribution and average health", size: "medium" },
  { id: "status_breakdown", name: "Status Breakdown", description: "Visual breakdown of tree statuses (alive, needs care, planted, dead)", size: "small" },
  { id: "impact_summary", name: "Environmental Impact", description: "Key environmental metrics: CO2 offset, oxygen produced, shade coverage", size: "large" },
  { id: "recent_activity", name: "Recent Activity", description: "Timeline of the most recent tree plantings and health checks", size: "medium" },
  { id: "top_planters", name: "Top Planters", description: "Leaderboard of most active tree planters", size: "small" },
  { id: "planting_reasons", name: "Planting Reasons", description: "Chart showing why trees were planted (reforestation, shade, etc.)", size: "medium" },
  { id: "monthly_trend", name: "Monthly Planting Trend", description: "Line chart showing planting activity over time", size: "large" },
  { id: "tree_count", name: "Total Tree Count", description: "Large number display of total trees recorded", size: "small" },
  { id: "health_alerts", name: "Health Alerts", description: "List of trees that need attention (low health scores)", size: "medium" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, currentWidgets } = await req.json();

    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(
        JSON.stringify({ error: "Message is required (max 500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a dashboard configuration assistant for a tree planting tracker app in Belize. Users describe what data they want to see and you select the best combination of widgets.

Available widgets:
${AVAILABLE_WIDGETS.map((w) => `- "${w.id}": ${w.name} — ${w.description} (size: ${w.size})`).join("\n")}

Current dashboard widgets: ${currentWidgets?.length ? currentWidgets.join(", ") : "none (empty dashboard)"}

Based on the user's request, return a JSON response with:
1. "widgets" — an array of widget IDs to display (ordered by importance)
2. "message" — a brief friendly response explaining what you set up

If the user wants to add to existing widgets, include both old and new. If they want to replace, only include new ones. Max 6 widgets.

Respond ONLY with valid JSON:
{
  "widgets": ["widget_id_1", "widget_id_2"],
  "message": "Brief explanation"
}`;

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
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Dashboard generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate widget IDs
    const validIds = AVAILABLE_WIDGETS.map((w) => w.id);
    result.widgets = (result.widgets || []).filter((id: string) => validIds.includes(id)).slice(0, 6);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Dashboard generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate dashboard. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
