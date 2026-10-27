import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  icon: string;
}

interface PlantingAdvisory {
  level: 'excellent' | 'good' | 'caution' | 'poor';
  message: string;
  tips: string[];
}

function generateAdvisory(weather: WeatherData): PlantingAdvisory {
  const tips: string[] = [];
  let level: 'excellent' | 'good' | 'caution' | 'poor' = 'good';
  let message = 'Good conditions for planting';

  // Temperature analysis
  if (weather.temperature >= 25 && weather.temperature <= 32) {
    tips.push('Temperature is ideal for tropical tree planting');
  } else if (weather.temperature > 32) {
    tips.push('Consider planting in early morning or late afternoon to avoid heat stress');
    level = 'caution';
    message = 'Hot conditions - plant with care';
  } else if (weather.temperature < 20) {
    tips.push('Cool temperatures may slow initial root establishment');
  }

  // Humidity analysis
  if (weather.humidity >= 60 && weather.humidity <= 80) {
    tips.push('Humidity levels are perfect for new plantings');
    if (level === 'good') {
      level = 'excellent';
      message = 'Excellent conditions for planting';
    }
  } else if (weather.humidity < 50) {
    tips.push('Low humidity - ensure adequate watering after planting');
  } else if (weather.humidity > 85) {
    tips.push('High humidity may increase fungal risk - ensure good drainage');
  }

  // Wind analysis
  if (weather.windSpeed < 15) {
    tips.push('Calm winds are ideal for transplanting');
  } else if (weather.windSpeed > 25) {
    tips.push('Stake young trees to protect against strong winds');
    level = 'caution';
    message = 'Windy conditions - stake young trees';
  }

  // Rain analysis
  const conditionLower = weather.condition.toLowerCase();
  if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
    tips.push('Rain is expected - great for natural watering after planting');
    if (conditionLower.includes('heavy') || conditionLower.includes('storm')) {
      level = 'poor';
      message = 'Heavy rain expected - delay planting if possible';
      tips.push('Wait until rain subsides to avoid soil compaction');
    }
  }

  // Add general tips if we have room
  if (tips.length < 3) {
    tips.push('Water deeply after planting to settle soil around roots');
    tips.push('Mulch around the base to retain moisture and suppress weeds');
  }

  return { level, message, tips: tips.slice(0, 3) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    // Input validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number'
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate weather data for Belize
    // In production, you would call a weather API like OpenWeatherMap
    const now = new Date();
    const hour = now.getHours();
    
    // Simulate realistic Belizean tropical weather
    const baseTemp = 28;
    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 4; // Warmer in afternoon
    const temperature = Math.round(baseTemp + tempVariation + (Math.random() - 0.5) * 2);
    
    const humidity = Math.round(70 + (Math.random() - 0.5) * 20);
    const windSpeed = Math.round(10 + Math.random() * 15);
    
    // Determine condition based on time and randomness
    const conditions = [
      { condition: 'Sunny', description: 'Clear skies with abundant sunshine', icon: 'sunny' },
      { condition: 'Partly Cloudy', description: 'Partly cloudy with sunny intervals', icon: 'partly-cloudy' },
      { condition: 'Cloudy', description: 'Overcast skies', icon: 'cloudy' },
      { condition: 'Light Showers', description: 'Occasional light showers expected', icon: 'rain-light' },
      { condition: 'Afternoon Showers', description: 'Typical tropical afternoon showers', icon: 'rain' },
    ];
    
    // More likely to have showers in afternoon (hours 14-18)
    let conditionIndex = Math.floor(Math.random() * 3);
    if (hour >= 14 && hour <= 18 && Math.random() > 0.4) {
      conditionIndex = 3 + Math.floor(Math.random() * 2);
    }
    
    const selectedCondition = conditions[Math.min(conditionIndex, conditions.length - 1)];
    
    const weather: WeatherData = {
      temperature,
      humidity,
      windSpeed,
      condition: selectedCondition.condition,
      description: selectedCondition.description,
      icon: selectedCondition.icon,
    };

    const advisory = generateAdvisory(weather);

    return new Response(
      JSON.stringify({ weather, advisory }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching weather:", error);
    return new Response(
      JSON.stringify({ error: "Service unavailable. Please try again later." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
