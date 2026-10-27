import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Lightbulb, Loader2, MapPin, TreePine, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PlantingGuidanceProps {
  latitude: number | null;
  longitude: number | null;
  treeType?: string;
}

interface LocationAnalysis {
  suitabilityScore: number;
  warnings: Array<{ type: string; message: string }>;
  recommendedSpecies: Array<{ name: string; reason: string }>;
  advice: string;
  locationContext: string;
}

export function PlantingGuidance({ latitude, longitude, treeType }: PlantingGuidanceProps) {
  const [analysis, setAnalysis] = useState<LocationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeLocation = async () => {
    if (latitude === null || longitude === null) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-location', {
        body: { latitude, longitude, treeType },
      });
      
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to analyze location:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze location');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      analyzeLocation();
    } else {
      setAnalysis(null);
    }
  }, [latitude, longitude, treeType]);

  if (latitude === null || longitude === null) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-6 text-center">
          <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a location on the map to get AI-powered planting guidance
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyzing location...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={analyzeLocation}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getSuitabilityColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-500/10';
    if (score >= 5) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  const getSuitabilityLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Smart Planting Analysis
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${getSuitabilityColor(analysis.suitabilityScore)}`}>
                {analysis.suitabilityScore}/10 {getSuitabilityLabel(analysis.suitabilityScore)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location context */}
            <p className="text-sm text-muted-foreground">
              {analysis.locationContext}
            </p>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Warnings
                </p>
                <div className="space-y-1.5">
                  {analysis.warnings.map((warning, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-amber-700">{warning.message}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Advice */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{analysis.advice}</p>
              </div>
            </div>

            {/* Recommended species */}
            {analysis.recommendedSpecies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recommended Native Species
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedSpecies.map((species, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="bg-accent/10 border-accent/30 gap-1"
                    >
                      <TreePine className="w-3 h-3" />
                      {species.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
