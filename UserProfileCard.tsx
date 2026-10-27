import { motion } from 'framer-motion';
import { X, TreePine, Calendar, MapPin, Flame, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserStats } from '@/services/gamificationService';

interface UserProfileCardProps {
  stats: UserStats;
  onClose: () => void;
}

const TREE_TYPE_LABELS: Record<string, string> = {
  oak: 'Oak',
  pine: 'Pine',
  maple: 'Maple',
  birch: 'Birch',
  cedar: 'Cedar',
  spruce: 'Spruce',
  willow: 'Willow',
  cherry: 'Cherry',
  apple: 'Apple',
  fruit: 'Fruit Tree',
  native: 'Native Species',
  mahogany: 'Mahogany',
  cohune: 'Cohune Palm',
  ceiba: 'Ceiba',
  mangrove: 'Mangrove',
  other: 'Other',
};

export function UserProfileCard({ stats, onClose }: UserProfileCardProps) {
  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md bg-card shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {stats.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold">{stats.name}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  Member since {formatDate(stats.firstTreeDate)}
                </p>
              </div>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <ScrollArea className="flex-1 overflow-auto">
          <CardContent className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TreePine className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTrees}</p>
                <p className="text-xs text-muted-foreground">Trees</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent/10">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Month Streak</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.neighborhoods.length}</p>
                <p className="text-xs text-muted-foreground">Areas</p>
              </div>
            </div>

            {/* Badges */}
            {stats.badges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Badges Earned</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.badges.map((badge) => (
                    <Badge 
                      key={badge.id} 
                      variant="secondary" 
                      className="gap-1.5 py-1.5 px-3"
                      title={badge.description}
                    >
                      <span className="text-base">{badge.emoji}</span>
                      <span>{badge.name}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Streak info */}
            {stats.longestStreak > 0 && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {stats.currentStreak > 0 
                        ? `🔥 ${stats.currentStreak} month streak active!`
                        : `Best streak: ${stats.longestStreak} months`
                      }
                    </p>
                    {stats.currentStreak > 0 && stats.currentStreak < stats.longestStreak && (
                      <p className="text-xs text-muted-foreground">
                        Best: {stats.longestStreak} months
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tree types breakdown */}
            {Object.keys(stats.treeTypes).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Species Planted</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(stats.treeTypes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <Badge key={type} variant="outline" className="gap-1 text-xs">
                        {TREE_TYPE_LABELS[type] || type}
                        <span className="text-muted-foreground">×{count}</span>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Neighborhoods */}
            {stats.neighborhoods.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Planting Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.neighborhoods.map((hood) => (
                    <Badge key={hood} variant="secondary" className="gap-1 text-xs">
                      <MapPin className="w-3 h-3" />
                      {hood}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </motion.div>
  );
}
