import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Loader2, AlertTriangle, CheckCircle, CloudSun } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advisory, setAdvisory] = useState<PlantingAdvisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('Belize');

  useEffect(() => {
    async function fetchWeatherForLocation(lat: number, lng: number) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-weather', {
          body: { latitude: lat, longitude: lng },
        });

        if (fnError) throw fnError;

        if (data?.weather) {
          setWeather(data.weather);
          setAdvisory(data.advisory);
        }
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('Unable to load weather data');
        // Set fallback data for demo
        setWeather({
          temperature: 28,
          humidity: 75,
          windSpeed: 12,
          condition: 'Partly Cloudy',
          description: 'Partly cloudy with a chance of afternoon showers',
          icon: 'partly-cloudy',
        });
        setAdvisory({
          level: 'good',
          message: 'Good conditions for planting',
          tips: [
            'Morning planting recommended before afternoon heat',
            'Soil moisture is adequate for new plantings',
            'Consider watering new trees in the evening',
          ],
        });
      } finally {
        setLoading(false);
      }
    }

    async function getLocationAndFetchWeather() {
      setLoading(true);
      
      // Default Belize City coordinates
      const defaultLat = 17.4967;
      const defaultLng = -88.1862;

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocationName('Your Location');
            fetchWeatherForLocation(latitude, longitude);
          },
          (geoError) => {
            console.log('Geolocation not available, using default:', geoError.message);
            setLocationName('Belize City');
            fetchWeatherForLocation(defaultLat, defaultLng);
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000, // Cache for 5 minutes
          }
        );
      } else {
        setLocationName('Belize City');
        fetchWeatherForLocation(defaultLat, defaultLng);
      }
    }

    getLocationAndFetchWeather();
  }, []);

  const getWeatherIcon = (condition: string) => {
    const condLower = condition.toLowerCase();
    if (condLower.includes('rain') || condLower.includes('shower')) {
      return <CloudRain className="w-8 h-8 text-primary" />;
    }
    if (condLower.includes('cloud') && condLower.includes('sun')) {
      return <CloudSun className="w-8 h-8 text-accent" />;
    }
    if (condLower.includes('cloud')) {
      return <Cloud className="w-8 h-8 text-muted-foreground" />;
    }
    return <Sun className="w-8 h-8 text-accent" />;
  };

  const getAdvisoryColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'good':
        return 'bg-moss/10 text-moss border-moss/20';
      case 'caution':
        return 'bg-gold/10 text-gold border-gold/20';
      case 'poor':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAdvisoryIcon = (level: string) => {
    switch (level) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'caution':
      case 'poor':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Current Weather */}
      <Card className="bg-gradient-to-br from-secondary/50 to-muted/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {weather && getWeatherIcon(weather.condition)}
              <div>
                <p className="text-2xl font-bold text-foreground">{weather?.temperature}°C</p>
                <p className="text-sm text-muted-foreground">{weather?.condition}</p>
                <p className="text-xs text-primary/80">{locationName}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Droplets className="w-3.5 h-3.5" />
                <span>{weather?.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                <Wind className="w-3.5 h-3.5" />
                <span>{weather?.windSpeed} km/h</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{weather?.description}</p>
        </CardContent>
      </Card>

      {/* Planting Advisory */}
      {advisory && (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${getAdvisoryColor(advisory.level)} border gap-1`}>
                {getAdvisoryIcon(advisory.level)}
                {advisory.level.charAt(0).toUpperCase() + advisory.level.slice(1)}
              </Badge>
              <span className="text-sm font-medium text-foreground">{advisory.message}</span>
            </div>
            <ul className="space-y-1.5">
              {advisory.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
