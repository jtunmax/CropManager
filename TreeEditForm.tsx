import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TreePine, MapPin, Loader2, Crosshair, Save, X, Waves } from 'lucide-react';
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
import { TreeFeature, updateTreeRecord } from '@/services/featureService';
import { TREE_TYPES, WATER_TOLERANT_TREE_TYPES, PLANTING_REASONS } from '@/constants/trees';

interface TreeEditFormProps {
  tree: TreeFeature;
  /** New coordinates chosen via "Move on map", if any */
  movedLocation: { lat: number; lng: number } | null;
  /** Whether the (possibly moved) location is in water */
  isWater?: boolean;
  /** Enter map pick mode to choose a new location */
  onPickLocation: () => void;
  onSaved: () => void;
  onCancel: () => void;
}

export function TreeEditForm({ tree, movedLocation, isWater = false, onPickLocation, onSaved, onCancel }: TreeEditFormProps) {
  const [treeType, setTreeType] = useState(tree.treeType || '');
  const [reason, setReason] = useState(tree.reason || '');
  const [notes, setNotes] = useState(tree.notes || '');
  const [submittedBy, setSubmittedBy] = useState(tree.submittedBy || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const availableTreeTypes = isWater ? WATER_TOLERANT_TREE_TYPES : TREE_TYPES;

  // Reset species if it isn't allowed at a water location
  useEffect(() => {
    if (treeType && !availableTreeTypes.some((t) => t.value === treeType)) {
      setTreeType('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWater]);

  const latitude = movedLocation?.lat ?? tree.latitude;
  const longitude = movedLocation?.lng ?? tree.longitude;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!treeType) {
      toast({ title: 'Tree type required', description: 'Please select a tree type', variant: 'destructive' });
      return;
    }
    if (!reason) {
      toast({ title: 'Reason required', description: 'Please select a planting reason', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await updateTreeRecord(tree.objectId, {
        latitude,
        longitude,
        treeType,
        reason,
        notes,
        submittedBy: submittedBy.trim() || 'Anonymous',
      });
      toast({ title: 'Tree updated', description: 'Your changes have been saved.' });
      onSaved();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update tree record.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-md max-h-full flex flex-col bg-card rounded-xl shadow-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-forest-light flex items-center justify-center shadow-soft">
          <TreePine className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-foreground">Edit Tree</h2>
          <p className="text-xs text-muted-foreground">Update details or move its location</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Location */}
          <div className="glass-card rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onPickLocation} className="gap-1.5 shrink-0">
                <Crosshair className="w-3.5 h-3.5" />
                Move on map
              </Button>
            </div>
            {movedLocation && (
              <p className="text-xs text-accent font-medium">Location will be moved when you save.</p>
            )}
            {isWater && (
              <div className="flex items-start gap-2 rounded-md border border-blue-300/50 bg-blue-500/10 p-2">
                <Waves className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Water location — only water-tolerant species allowed here.
                </p>
              </div>
            )}
          </div>

          {/* Tree type */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
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
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Planting Reason</Label>
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

          {/* Submitted by */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Planted By</Label>
            <Input
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="Planter's name"
              className="bg-card border-border"
              maxLength={50}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="bg-card border-border resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border/50 shrink-0">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
