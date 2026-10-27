import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TreePine, User, Calendar, MapPin, ArrowLeft, FileText, Heart, Camera, Loader2, List, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TreeFeature } from '@/services/featureService';
import { getStatusLabel, getStatusEmoji, TreeStatus } from '@/services/healthService';
import { getAttachments, AttachmentInfo } from '@/services/attachmentService';
import { TREE_TYPE_LABELS, REASON_LABELS } from '@/constants/trees';

interface TreePopupProps {
  tree: TreeFeature;
  onClose: () => void;
  onHealthCheck?: () => void;
  onViewInActivity?: () => void;
  onEdit?: () => void;
}

export function TreePopup({ tree, onClose, onHealthCheck, onViewInActivity, onEdit }: TreePopupProps) {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setLoadingPhoto(true);
    setPhotoError(false);
    getAttachments(tree.objectId).then((atts) => {
      setAttachments(atts);
      setLoadingPhoto(false);
    });
  }, [tree.objectId]);

  const photoAttachment = attachments.find((a) =>
    a.contentType?.startsWith('image/')
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const treeStatus = ((tree as any).status as TreeStatus) || 'planted';
  const healthScore = (tree as any).healthScore || (tree as any).health_score;
  const lastCheckDate = (tree as any).lastCheckDate || (tree as any).last_check_date;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 md:inset-auto md:bottom-10 md:right-4 md:w-96 md:max-h-[70vh] md:rounded-xl md:shadow-xl z-20 flex flex-col bg-card/95 backdrop-blur-sm overflow-hidden"
    >

      {/* Back button header - mobile only */}
      <div className="flex md:hidden items-center gap-2 p-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Map
        </Button>
      </div>

      {/* Close button - desktop only */}
      <Button variant="ghost" size="icon" onClick={onClose} className="hidden md:flex absolute top-2 right-2 z-10 h-7 w-7 rounded-full hover:bg-muted">
        <X className="w-4 h-4" />
      </Button>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-y-auto">
        {/* Photo section */}
        {loadingPhoto ? (
          <div className="h-32 md:h-40 bg-muted/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : photoAttachment ? (
          <div className="relative h-32 md:h-40 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={photoAttachment.url}
              alt={`Photo of ${TREE_TYPE_LABELS[tree.treeType] || tree.treeType}`}
              className="w-full h-full object-cover"
              onError={() => setPhotoError(true)}
              style={photoError ? { display: 'none' } : undefined}
            />
            {photoError && (
              <div className="h-full bg-muted/30 flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : null}

        {/* Header */}
        <div className="flex items-center gap-3 mt-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TreePine className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {TREE_TYPE_LABELS[tree.treeType] || tree.treeType || 'Unknown Tree'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {REASON_LABELS[tree.reason] || tree.reason || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Health Status Badge */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusEmoji(treeStatus)}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{getStatusLabel(treeStatus)}</p>
              {healthScore && (
                <p className="text-xs text-muted-foreground">Health: {healthScore}/10</p>
              )}
            </div>
          </div>
          {lastCheckDate && (
            <div className="text-xs text-muted-foreground text-right">
              <p>Last checked</p>
              <p>{formatDate(new Date(lastCheckDate))}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm mt-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4 text-primary/70" />
            <span>Planted by: <span className="text-foreground font-medium">{tree.submittedBy || 'Anonymous'}</span></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary/70" />
            <span>{formatDate(tree.submittedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary/70" />
            <span className="font-mono text-xs">
              {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
            </span>
          </div>
          {tree.notes && (
            <div className="flex items-start gap-2 text-muted-foreground pt-1">
              <FileText className="w-4 h-4 text-primary/70 mt-0.5" />
              <p className="text-foreground/80 italic">"{tree.notes}"</p>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons - pinned to bottom */}
        <div className="flex flex-col gap-2 pt-3 flex-shrink-0">
          {onViewInActivity && (
            <Button variant="outline" className="w-full" onClick={onViewInActivity}>
              <List className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" className="flex-1" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onHealthCheck && (
              <Button variant="outline" className="flex-1" onClick={onHealthCheck}>
                <Heart className="w-4 h-4 mr-2" />
                Health Check
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
