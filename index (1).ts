import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthAnalysisRequest {
  imageBase64: string;
  treeType?: string;
  previousStatus?: string;
}

interface HealthAnalysisResponse {
  healthScore: number; // 1-10
  status: "planted" | "alive" | "needs_care" | "dead";
  condition: string;
  observations: string[];
  recommendations: string[];
  estimatedHeight?: string;
  estimatedCanopyWidth?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, treeType, previousStatus } = (await req.json()) as HealthAnalysisRequest;

    const MAX_B64_LEN = 14_000_000; // ~10 MB base64
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length > MAX_B64_LEN) {
      return new Response(
        JSON.stringify({ error: "Image is required and must be under 10 MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert arborist and tree health specialist. Analyze the provided tree photo and assess its health status.

Based on the image, provide:
1. A health score from 1-10 (1=dead/dying, 5=needs care, 8+=healthy/thriving)
2. A status category: "planted" (newly planted, too early to assess), "alive" (healthy and thriving), "needs_care" (visible issues requiring attention), or "dead" (no longer living)
3. A brief condition description (2-3 words like "Healthy and thriving" or "Showing stress signs")
4. 2-4 specific observations about the tree's health (leaf color, bark condition, growth patterns, pest/disease signs)
5. 1-3 actionable recommendations for care
6. If visible, estimate the tree's height (e.g., "2-3 meters") and canopy width (e.g., "1.5 meters")

Be encouraging but honest. Focus on what can be observed in the photo.`;

    const userPrompt = `Analyze this tree photo for health assessment.
${treeType ? `Tree type: ${treeType}` : "Tree type: Unknown"}
${previousStatus ? `Previous status: ${previousStatus}` : "This is the first health check."}

Provide your analysis in this exact JSON format:
{
  "healthScore": <number 1-10>,
  "status": "<planted|alive|needs_care|dead>",
  "condition": "<brief 2-3 word description>",
  "observations": ["<observation 1>", "<observation 2>", ...],
  "recommendations": ["<recommendation 1>", ...],
  "estimatedHeight": "<height estimate or null>",
  "estimatedCanopyWidth": "<width estimate or null>"
}`;

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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
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
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze tree health");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No response content from AI");
      return new Response(
        JSON.stringify({ error: "Analysis could not be completed. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Analysis could not be completed. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis: HealthAnalysisResponse = JSON.parse(jsonMatch[0]);

    // Validate and sanitize the response
    const validStatuses = ["planted", "alive", "needs_care", "dead"];
    if (!validStatuses.includes(analysis.status)) {
      analysis.status = "alive";
    }

    analysis.healthScore = Math.max(1, Math.min(10, Math.round(analysis.healthScore || 5)));

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health analysis error:", error);
    return new Response(
      JSON.stringify({ error: "Service unavailable. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
