import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreePine, Camera, MapPin, Check, X, Upload, Loader2, ShieldCheck, ShieldAlert, Waves } from 'lucide-react';
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
import { PlantingGuidance } from '@/components/PlantingGuidance';
import { TREE_TYPES, WATER_TOLERANT_TREE_TYPES, PLANTING_REASONS } from '@/constants/trees';

interface TreeSubmissionFormProps {
  selectedLocation: { lat: number; lng: number } | null;
  /** True when the selected point is in water — restricts species to
   *  water-tolerant ones (mangrove, coconut, etc.) */
  isWater?: boolean;
  onSubmit: (data: TreeSubmissionData) => Promise<void>;
  onCancel: () => void;
}

export interface TreeSubmissionData {
  latitude: number;
  longitude: number;
  treeType: string;
  reason: string;
  notes: string;
  imageBase64: string;
  submittedBy: string;
  // Initial health fields
  status: 'planted' | 'alive' | 'needs_care' | 'dead';
  healthScore: number;
  treeHeight?: string;
  canopyWidth?: string;
}

// Tree types & reasons live in src/constants/trees.ts (shared with TreePopup/TreeEditForm)

export function TreeSubmissionForm({ selectedLocation, isWater = false, onSubmit, onCancel }: TreeSubmissionFormProps) {
  const [treeType, setTreeType] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isTree: boolean;
    confidence: number;
    description: string;
  } | null>(null);
  // Initial health fields
  const [status, setStatus] = useState<'planted' | 'alive' | 'needs_care' | 'dead'>('alive');
  const [healthScore, setHealthScore] = useState(8);
  const [treeHeight, setTreeHeight] = useState('');
  const [canopyWidth, setCanopyWidth] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Water locations only allow water-tolerant species
  const availableTreeTypes = isWater ? WATER_TOLERANT_TREE_TYPES : TREE_TYPES;

  // Reset the selection if it isn't allowed at this location
  useEffect(() => {
    if (treeType && !availableTreeTypes.some((t) => t.value === treeType)) {
      setTreeType('');
    }
  }, [isWater, treeType, availableTreeTypes]);

  const verifyTreeImage = async (base64: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-tree-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64 }),
        }
      );
      const result = await response.json();
      setVerificationResult(result);

      if (!result.isTree && result.confidence > 0.5) {
        toast({
          title: 'Image may not be a tree',
          description: result.description || 'Please upload a photo of a tree.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Tree verification failed:', error);
      // Don't block on verification failure
      setVerificationResult({ isTree: true, confidence: 0, description: 'Verification unavailable' });
    } finally {
      setIsVerifying(false);
    }
  };

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
      verifyTreeImage(result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation) {
      toast({
        title: 'Location required',
        description: 'Please select a location on the map',
        variant: 'destructive',
      });
      return;
    }

    if (!treeType) {
      toast({
        title: 'Tree type required',
        description: 'Please select a tree type',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Please select a planting reason',
        variant: 'destructive',
      });
      return;
    }

    if (!imageBase64) {
      toast({
        title: 'Image required',
        description: 'Please upload a verification photo',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        treeType,
        reason,
        notes,
        imageBase64,
        submittedBy: submitterName.trim() || 'Anonymous',
        status,
        healthScore,
        treeHeight: treeHeight || undefined,
        canopyWidth: canopyWidth || undefined,
      });

      // Reset form
      setTreeType('');
      setReason('');
      setNotes('');
      setSubmitterName('');
      setStatus('planted');
      setHealthScore(8);
      setTreeHeight('');
      setCanopyWidth('');
      removeImage();

      toast({
        title: 'Tree recorded!',
        description: 'Your tree planting has been submitted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'Failed to submit tree record. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedLocation && treeType && reason && imageBase64;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {/* Location status */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedLocation ? 'bg-accent/20' : 'bg-muted'
              }`}>
                <MapPin className={`w-5 h-5 ${selectedLocation ? 'text-accent' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Location</p>
                {selectedLocation ? (
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click on the map to select</p>
                )}
              </div>
              {selectedLocation && (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* AI Planting Guidance */}
          <PlantingGuidance 
            latitude={selectedLocation?.lat ?? null}
            longitude={selectedLocation?.lng ?? null}
            treeType={treeType || undefined}
          />

          {/* Water location notice */}
          {isWater && (
            <div className="rounded-lg border border-blue-300/50 bg-blue-500/10 p-3 flex items-start gap-2.5">
              <Waves className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Water location detected</p>
                <p className="text-xs text-muted-foreground">
                  This spot is in or beside water, so only water-tolerant species (mangrove, coconut palm and similar) can be planted here.
                </p>
              </div>
            </div>
          )}

          {/* Tree type */}
          <div className="space-y-2">
            <Label htmlFor="treeType" className="text-foreground font-medium">
              Tree Type
              {isWater && <span className="text-blue-500 font-normal ml-1">(water-tolerant only)</span>}
            </Label>
            <Select value={treeType} onValueChange={setTreeType}>
              <SelectTrigger className="w-full bg-card border-border">
                <SelectValue placeholder="Select tree type..." />
              </SelectTrigger>
              <SelectContent>
                {availableTreeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-primary" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-foreground font-medium">
              Planting Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full bg-card border-border">
                <SelectValue placeholder="Why was this tree planted?" />
              </SelectTrigger>
              <SelectContent>
                {PLANTING_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Health Status Section */}
          <div className="glass-card rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <TreePine className="w-4 h-4 text-primary" />
              Initial Health Status
            </h3>
            
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground font-medium text-sm">
                Tree Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">🌳 Alive & Healthy</SelectItem>
                  <SelectItem value="needs_care">⚠️ Needs Care</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Health Score */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium text-sm">
                Initial Health Score: <span className="text-primary">{healthScore}/10</span>
              </Label>
              <input
                type="range"
                min="1"
                max="10"
                value={healthScore}
                onChange={(e) => setHealthScore(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Height and Canopy in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="treeHeight" className="text-foreground font-medium text-sm">
                  Height
                  <span className="text-muted-foreground font-normal ml-1">(opt.)</span>
                </Label>
                <Input
                  id="treeHeight"
                  value={treeHeight}
                  onChange={(e) => setTreeHeight(e.target.value)}
                  placeholder="e.g. 1 meter"
                  className="bg-card border-border"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canopyWidth" className="text-foreground font-medium text-sm">
                  Canopy Width
                  <span className="text-muted-foreground font-normal ml-1">(opt.)</span>
                </Label>
                <Input
                  id="canopyWidth"
                  value={canopyWidth}
                  onChange={(e) => setCanopyWidth(e.target.value)}
                  placeholder="e.g. 0.5 meters"
                  className="bg-card border-border"
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          {/* Submitted By */}
          <div className="space-y-2">
            <Label htmlFor="submitterName" className="text-foreground font-medium">
              Your Name
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <Input
              id="submitterName"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Enter your name for the leaderboard..."
              className="bg-card border-border"
              maxLength={50}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground font-medium">
              Additional Notes
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details about the planting..."
              className="bg-card border-border resize-none"
              rows={3}
            />
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Verification Photo
            </Label>
            
            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative rounded-lg overflow-hidden border border-border"
                >
                  <img 
                    src={imagePreview} 
                    alt="Tree preview" 
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {/* Verification badge */}
                  <div className="absolute bottom-2 left-2">
                    {isVerifying ? (
                      <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Verifying...</span>
                      </div>
                    ) : verificationResult ? (
                      <div className={`flex items-center gap-1.5 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs ${
                        verificationResult.isTree 
                          ? 'bg-accent/90 text-accent-foreground' 
                          : 'bg-destructive/90 text-destructive-foreground'
                      }`}>
                        {verificationResult.isTree ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        <span>{verificationResult.isTree ? 'Tree verified' : 'Not a tree'}</span>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card/50 hover:bg-card transition-colors">
                      <div className="flex flex-col items-center justify-center py-4">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Choose from gallery</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
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
                          // Remove capture attribute so gallery pick still works via label
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
        </div>

        {/* Action buttons */}
        <div className="pt-5 mt-5 border-t border-border flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Submit Tree
              </span>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}