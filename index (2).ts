import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { treeSummary } = await req.json();

    if (!treeSummary) {
      return new Response(
        JSON.stringify({ error: "Tree summary data is required" }),
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

    const systemPrompt = `You are an environmental data analyst for a tree planting initiative in Belize. Given tree planting data, provide insightful analysis.

Return a JSON object with these fields:
- "summary": A 2-3 sentence overview of the tree planting program's impact (plain language, engaging).
- "co2_insight": A specific insight about CO2 offset impact with a real-world comparison (e.g., "equivalent to taking X cars off the road").
- "biodiversity_score": A score from 1-100 based on species diversity (more unique species = higher score). Include a brief explanation.
- "health_prediction": A brief prediction about the forest health trend based on current health scores.
- "recommendations": An array of 2-3 specific, actionable recommendations for the community.
- "fun_fact": A fun or surprising fact related to the types of trees planted.
- "ecosystem_value": Estimated annual ecosystem services value in USD (shade, air quality, water filtration, property values, etc.) with brief methodology note.

Be specific to Belize's ecosystem. Use actual numbers from the data. Keep each field concise (1-3 sentences max).

Respond ONLY with valid JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the tree planting data summary:\n${JSON.stringify(treeSummary, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate insights. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
