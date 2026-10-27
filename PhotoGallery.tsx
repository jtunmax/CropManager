import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, X, ChevronLeft, ChevronRight, Loader2, TreePine, MapPin, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { format } from 'date-fns';

interface PhotoItem {
  id: number;
  url: string;
  tree: TreeFeature;
}

interface PhotoGalleryProps {
  refreshTrigger?: number;
}

const FEATURE_SERVICE_URL = 'https://services.arcgis.com/lkHhAsiwtcKnwSeA/arcgis/rest/services/treetrackerapp/FeatureServer/0';

export function PhotoGallery({ refreshTrigger }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    async function loadPhotos() {
      setLoading(true);
      try {
        const trees = await getTreeRecords();
        
        // Fetch attachments for all trees
        const photoPromises = trees.map(async (tree) => {
          try {
            const attachmentUrl = `${FEATURE_SERVICE_URL}/${tree.objectId}/attachments?f=json`;
            const response = await fetch(attachmentUrl);
            const data = await response.json();
            
            if (data.attachmentInfos && data.attachmentInfos.length > 0) {
              // Get the first attachment as the tree photo
              const attachment = data.attachmentInfos[0];
              return {
                id: attachment.id,
                url: `${FEATURE_SERVICE_URL}/${tree.objectId}/attachments/${attachment.id}`,
                tree,
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to fetch attachments for tree ${tree.objectId}:`, error);
            return null;
          }
        });

        const results = await Promise.all(photoPromises);
        const validPhotos = results.filter((p): p is PhotoItem => p !== null);
        setPhotos(validPhotos);
      } catch (error) {
        console.error('Failed to load photos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPhotos();
  }, [refreshTrigger]);

  const openLightbox = (photo: PhotoItem, index: number) => {
    setSelectedPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const goToPrevious = () => {
    const newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const goToNext = () => {
    const newIndex = lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Loading community photos...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">No Photos Yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to add a photo of your planted tree!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Community Gallery</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </Badge>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <motion.div
            key={`${photo.tree.objectId}-${photo.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
            onClick={() => openLightbox(photo, index)}
          >
            <img
              src={photo.url}
              alt={`${photo.tree.treeType} tree`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-medium truncate">{photo.tree.treeType}</p>
                <p className="text-white/70 text-[10px]">{photo.tree.submittedBy}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/95">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Image */}
            <AnimatePresence mode="wait">
              {selectedPhoto && (
                <motion.div
                  key={selectedPhoto.tree.objectId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  <div className="relative w-full h-[65vh] max-h-[65vh] flex items-center justify-center">
                    <img
                      src={selectedPhoto.url}
                      alt={`${selectedPhoto.tree.treeType} tree`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Photo info */}
                  <div className="p-4 bg-black/80 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TreePine className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">{selectedPhoto.tree.treeType}</h3>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-white/70">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {selectedPhoto.tree.submittedBy || 'Anonymous'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(selectedPhoto.tree.submittedDate, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedPhoto.tree.latitude.toFixed(4)}, {selectedPhoto.tree.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-white/50">
                        {lightboxIndex + 1} / {photos.length}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
