import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TreePine, Crown, Loader2, Flame, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { 
  calculateUserStats, 
  getCommunityStats, 
  detectNeighborhood, 
  UserStats 
} from '@/services/gamificationService';
import { UserProfileCard } from '@/components/UserProfileCard';
import { LeaderboardFiltersComponent, LeaderboardFilters } from '@/components/LeaderboardFilters';

interface LeaderboardEntry {
  name: string;
  treeCount: number;
  rank: number;
  stats: UserStats;
}

interface LeaderboardProps {
  refreshTrigger?: number;
}

export function Leaderboard({ refreshTrigger = 0 }: LeaderboardProps) {
  const [allTrees, setAllTrees] = useState<TreeFeature[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    month: null,
    neighborhood: null,
    treeType: null,
  });

  // Compute available filter options from all trees
  const filterOptions = useMemo(() => {
    const months = new Set<string>();
    const neighborhoods = new Set<string>();
    const treeTypes = new Set<string>();

    allTrees.forEach((tree) => {
      // Month
      const month = `${tree.submittedDate.getFullYear()}-${String(tree.submittedDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(month);
      
      // Neighborhood
      if (tree.latitude && tree.longitude) {
        neighborhoods.add(detectNeighborhood(tree.latitude, tree.longitude));
      }
      
      // Tree type
      if (tree.treeType) {
        treeTypes.add(tree.treeType);
      }
    });

    return {
      months: Array.from(months).sort().reverse(),
      neighborhoods: Array.from(neighborhoods).sort(),
      treeTypes: Array.from(treeTypes).sort(),
    };
  }, [allTrees]);

  // Filter trees based on active filters
  const filteredTrees = useMemo(() => {
    return allTrees.filter((tree) => {
      // Month filter
      if (filters.month) {
        const treeMonth = `${tree.submittedDate.getFullYear()}-${String(tree.submittedDate.getMonth() + 1).padStart(2, '0')}`;
        if (treeMonth !== filters.month) return false;
      }
      
      // Neighborhood filter
      if (filters.neighborhood && tree.latitude && tree.longitude) {
        if (detectNeighborhood(tree.latitude, tree.longitude) !== filters.neighborhood) return false;
      }
      
      // Tree type filter
      if (filters.treeType && tree.treeType !== filters.treeType) return false;
      
      return true;
    });
  }, [allTrees, filters]);

  // Community stats
  const communityStats = useMemo(() => getCommunityStats(allTrees), [allTrees]);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const trees = await getTreeRecords();
        setAllTrees(trees);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [refreshTrigger]);

  // Recalculate leaderboard when filtered trees change
  useEffect(() => {
    // Aggregate tree counts by submitter
    const counts: Record<string, number> = {};
    filteredTrees.forEach((tree) => {
      const name = tree.submittedBy || 'Anonymous';
      counts[name] = (counts[name] || 0) + 1;
    });

    // Convert to array with full stats
    const entries = Object.entries(counts)
      .map(([name, treeCount]) => ({
        name,
        treeCount,
        rank: 0,
        stats: calculateUserStats(allTrees, name),
      }))
      .sort((a, b) => b.treeCount - a.treeCount);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    setLeaderboard(entries);
  }, [filteredTrees, allTrees]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-slate-400/20 to-slate-300/10 border-slate-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
      default:
        return 'bg-card border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Community stats header - enhanced */}
      <Card className="mb-4 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-sunset flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            Community Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="stat-card p-3">
              <TreePine className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{communityStats.totalTrees}</p>
              <p className="text-xs text-muted-foreground">Total Trees</p>
            </div>
            <div className="stat-card p-3">
              <Users className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{communityStats.totalContributors}</p>
              <p className="text-xs text-muted-foreground">Planters</p>
            </div>
            <div className="stat-card p-3">
              <TrendingUp className="w-5 h-5 text-moss mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{communityStats.thisMonthTrees}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="mb-3">
        <LeaderboardFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableMonths={filterOptions.months}
          availableNeighborhoods={filterOptions.neighborhoods}
          availableTreeTypes={filterOptions.treeTypes}
        />
      </div>

      {/* Leaderboard list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <TreePine className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No trees recorded yet</p>
              <p className="text-sm text-muted-foreground/60">Be the first to plant!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <motion.div
                key={entry.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border cursor-pointer ${getRankStyle(entry.rank)} transition-all hover:scale-[1.02]`}
                onClick={() => setSelectedUser(entry.stats)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {entry.name}
                    </p>
                    {/* Badges preview */}
                    {entry.stats.badges.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {entry.stats.badges.slice(0, 4).map((badge) => (
                          <span key={badge.id} className="text-sm" title={badge.name}>
                            {badge.emoji}
                          </span>
                        ))}
                        {entry.stats.badges.length > 4 && (
                          <span className="text-xs text-muted-foreground ml-0.5">
                            +{entry.stats.badges.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Streak indicator */}
                    {entry.stats.currentStreak > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs bg-orange-500/10 border-orange-500/30">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {entry.stats.currentStreak}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5 text-primary">
                      <TreePine className="w-4 h-4" />
                      <span className="font-bold">{entry.treeCount}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* User profile modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserProfileCard 
            stats={selectedUser} 
            onClose={() => setSelectedUser(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
