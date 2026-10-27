import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      // Fail open - if API key missing, assume location is valid
      return new Response(
        JSON.stringify({ isWater: false, confidence: 'low', reason: 'Unable to verify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI Gateway to analyze if the location is on water
    const systemPrompt = `You are a geographic analysis assistant. Determine if coordinates are on water (ocean, sea, river, lake, lagoon) in Belize. Consider:
- The Caribbean Sea is to the east of Belize
- Belize has many rivers including the Belize River, Mopan River, and Macal River
- There are lagoons like Northern Lagoon and Southern Lagoon
- The Belize Barrier Reef is offshore

Respond with ONLY a JSON object: {"isWater": true/false, "confidence": "high/medium/low", "reason": "brief explanation"}`;

    const userPrompt = `Analyze these coordinates in Belize:
Latitude: ${latitude}
Longitude: ${longitude}

Is this location on water?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later', isWater: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable', isWater: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fail open - if AI fails, assume location is valid
      return new Response(
        JSON.stringify({ isWater: false, confidence: 'low', reason: 'Unable to verify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            isWater: result.isWater === true,
            confidence: result.confidence || 'medium',
            reason: result.reason || '',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Default to allowing if parsing fails
    return new Response(
      JSON.stringify({ isWater: false, confidence: 'low', reason: 'Unable to determine' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-location:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', isWater: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
