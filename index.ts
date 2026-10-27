import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationAnalysisRequest {
  latitude: number;
  longitude: number;
  treeType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, treeType } = await req.json() as LocationAnalysisRequest;

    // Input validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number'
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize treeType - limit length and strip special characters
    const sanitizedTreeType = treeType ? String(treeType).slice(0, 100).replace(/[^\w\s-]/g, '') : undefined;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt for location analysis
    const prompt = `You are an expert arborist and environmental consultant analyzing a potential tree planting location in Belize.

Location coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
${sanitizedTreeType ? `Proposed tree species: ${sanitizedTreeType}` : 'No specific tree type selected yet'}

Based on these coordinates (which are in Belize, Central America), analyze this location and provide:

1. **Suitability Score**: Rate 1-10 how suitable this location is for tree planting
2. **Warnings**: List any potential concerns such as:
   - Proximity to roads, buildings, or infrastructure
   - Protected areas or reserves
   - Flood-prone zones
   - Soil or climate concerns for the region
3. **Species Recommendation**: If the location has specific conditions (coastal, wetland, elevated, urban, etc.), suggest 2-3 native Belizean tree species that would thrive there
4. **Natural Language Advice**: A friendly 2-3 sentence recommendation

Consider Belize's geography:
- Coastal areas with mangroves (sea level to ~10m elevation)
- Northern lowlands (seasonal flooding, savanna)
- Maya Mountains region (elevated, tropical forest)
- River valleys (riparian zones)
- Caribbean coast vs inland

Respond in JSON format:
{
  "suitabilityScore": number,
  "warnings": [{"type": "warning_type", "message": "description"}],
  "recommendedSpecies": [{"name": "species name", "reason": "why suitable"}],
  "advice": "Natural language recommendation",
  "locationContext": "Brief description of the likely environment at these coordinates"
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
          { role: "system", content: "You are an expert environmental consultant specializing in tree planting in Belize. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response from the AI
    let analysis;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback response
      analysis = {
        suitabilityScore: 7,
        warnings: [],
        recommendedSpecies: [
          { name: "Mahogany", reason: "Native to Belize and adaptable" },
          { name: "Ceiba", reason: "Iconic Belizean tree, grows well in various conditions" }
        ],
        advice: "This location appears suitable for tree planting. Consider native Belizean species for best results.",
        locationContext: "Location in Belize"
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-location error:", error);
    return new Response(JSON.stringify({ 
      error: "Service unavailable. Please try again later." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
