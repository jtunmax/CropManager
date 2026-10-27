import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, Heart, Upload, Sparkles, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TreeFeature } from '@/services/featureService';
import {
  TreeStatus,
  HealthAnalysis,
  analyzeTreeHealth,
  updateTreeHealth,
  getStatusLabel,
  getStatusEmoji,
} from '@/services/healthService';

interface HealthCheckFormProps {
  tree: TreeFeature;
  onComplete: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: TreeStatus; label: string; emoji: string }[] = [
  { value: 'planted', label: 'Newly Planted', emoji: '🌱' },
  { value: 'alive', label: 'Healthy & Thriving', emoji: '🌳' },
  { value: 'needs_care', label: 'Needs Care', emoji: '⚠️' },
  { value: 'dead', label: 'Dead / Replaced', emoji: '💀' },
];

export function HealthCheckForm({ tree, onComplete, onCancel }: HealthCheckFormProps) {
  const [status, setStatus] = useState<TreeStatus>((tree as any).status || 'alive');
  const [healthScore, setHealthScore] = useState<number>((tree as any).healthScore || 7);
  const [notes, setNotes] = useState('');
  const [height, setHeight] = useState((tree as any).treeHeight || '');
  const [canopyWidth, setCanopyWidth] = useState((tree as any).canopyWidth || '');
  const [checkerName, setCheckerName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<HealthAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
      setAiAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setAiAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAIAnalysis = async () => {
    if (!imageBase64) {
      toast({
        title: 'Photo required',
        description: 'Please upload a photo first for AI analysis',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeTreeHealth(
        imageBase64,
        tree.treeType,
        (tree as any).status
      );
      
      setAiAnalysis(analysis);
      setStatus(analysis.status);
      setHealthScore(analysis.healthScore);
      
      if (analysis.estimatedHeight) {
        setHeight(analysis.estimatedHeight);
      }
      if (analysis.estimatedCanopyWidth) {
        setCanopyWidth(analysis.estimatedCanopyWidth);
      }

      // Auto-fill notes with AI observations
      const autoNotes = [
        `Condition: ${analysis.condition}`,
        ...analysis.observations,
      ].join('\n');
      setNotes(autoNotes);

      toast({
        title: 'Analysis complete!',
        description: `Health score: ${analysis.healthScore}/10 - ${analysis.condition}`,
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze the photo',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await updateTreeHealth({
        objectId: tree.objectId,
        status,
        healthScore,
        notes,
        height: height || undefined,
        canopyWidth: canopyWidth || undefined,
        checkedBy: checkerName.trim() || 'Anonymous',
        imageBase64: imageBase64 || undefined,
      });

      toast({
        title: 'Health check recorded!',
        description: 'Thank you for helping maintain our trees.',
      });
      onComplete();
    } catch (error) {
      toast({
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not save health check. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-card rounded-t-xl md:rounded-xl p-5 max-w-md w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Health Check</h3>
            <p className="text-sm text-muted-foreground">{tree.treeType || 'Unknown tree'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo upload with AI analysis */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">
            Current Photo
            <span className="text-muted-foreground font-normal ml-1">(for AI analysis)</span>
          </Label>
          
          <AnimatePresence mode="wait">
            {imagePreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-2"
              >
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={imagePreview} 
                    alt="Tree preview" 
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Analyze with AI
                    </span>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card/50 hover:bg-card transition-colors">
                    <div className="flex flex-col items-center justify-center py-3">
                      <Upload className="w-7 h-7 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Choose from gallery</span>
                      </p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                        setTimeout(() => fileInputRef.current?.removeAttribute('capture'), 100);
                      }
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Analysis Results */}
        <AnimatePresence>
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                AI Analysis
              </div>
              <p className="text-sm text-foreground font-medium">{aiAnalysis.condition}</p>
              
              {aiAnalysis.recommendations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Recommendations:</p>
                  <ul className="text-xs text-foreground space-y-1">
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <Check className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Tree Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TreeStatus)}>
            <SelectTrigger className="w-full bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Health Score */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">
            Health Score: <span className="text-primary">{healthScore}/10</span>
          </Label>
          <input
            type="range"
            min="1"
            max="10"
            value={healthScore}
            onChange={(e) => setHealthScore(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Growth metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="height" className="text-foreground font-medium text-sm">
              Height
            </Label>
            <Input
              id="height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g., 2-3 meters"
              className="bg-card border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canopy" className="text-foreground font-medium text-sm">
              Canopy Width
            </Label>
            <Input
              id="canopy"
              value={canopyWidth}
              onChange={(e) => setCanopyWidth(e.target.value)}
              placeholder="e.g., 1.5 meters"
              className="bg-card border-border"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-foreground font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations about the tree's health..."
            className="bg-card border-border resize-none"
            rows={3}
          />
        </div>

        {/* Checker name */}
        <div className="space-y-2">
          <Label htmlFor="checker" className="text-foreground font-medium">
            Your Name
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </Label>
          <Input
            id="checker"
            value={checkerName}
            onChange={(e) => setCheckerName(e.target.value)}
            placeholder="Who checked this tree?"
            className="bg-card border-border"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Save Check-in
              </span>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
