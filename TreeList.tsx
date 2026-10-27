import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreePine, MapPin, User, Calendar, ChevronRight, RefreshCw, Loader2, AlertCircle, ArrowLeft, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { TreeListFilters, TreeFilters } from '@/components/TreeListFilters';
import { TreeHealthTimeline } from '@/components/TreeHealthTimeline';
import { TREE_TYPE_LABELS, REASON_LABELS } from '@/constants/trees';
import { MiniTreeMap } from '@/components/MiniTreeMap';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface TreeListProps {
  onTreeSelect?: (tree: TreeFeature) => void;
  refreshTrigger?: number;
  selectedTree?: TreeFeature | null;
  autoShowDetail?: boolean;
  onDetailClosed?: () => void;
  initialStatus?: string;
  filterResetKey?: number;
}

export function TreeList({ onTreeSelect, refreshTrigger, selectedTree, autoShowDetail, onDetailClosed, initialStatus = '', filterResetKey = 0 }: TreeListProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const selectedTreeRef = useRef<HTMLDivElement>(null);
  
  const [filters, setFilters] = useState<TreeFilters>({
    datePreset: 'all',
    dateRange: undefined,
    treeType: '',
    planterName: '',
    status: initialStatus,
  });

  useEffect(() => {
    setFilters(previous => ({ ...previous, status: initialStatus }));
    setShowTimeline(false);
  }, [initialStatus, filterResetKey]);

  const fetchTrees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await getTreeRecords();
      // Sort by date, newest first
      records.sort((a, b) => b.submittedDate.getTime() - a.submittedDate.getTime());
      setTrees(records);
    } catch (err) {
      console.error('Failed to fetch trees:', err);
      setError('Failed to load tree records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrees();
  }, [refreshTrigger]);

  // Scroll to selected tree when it changes
  useEffect(() => {
    if (selectedTree && selectedTreeRef.current) {
      selectedTreeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTree]);

  // Auto-show detail view when triggered from map popup "View Details"
  useEffect(() => {
    if (autoShowDetail && selectedTree) {
      setShowTimeline(true);
    }
  }, [autoShowDetail, selectedTree]);

  // Extract unique tree types and planter names for filter dropdowns
  const { uniqueTreeTypes, uniquePlanterNames } = useMemo(() => {
    const types = new Set<string>();
    const names = new Set<string>();
    trees.forEach(tree => {
      if (tree.treeType) types.add(tree.treeType);
      if (tree.submittedBy) names.add(tree.submittedBy);
    });
    return {
      uniqueTreeTypes: Array.from(types).sort(),
      uniquePlanterNames: Array.from(names).sort(),
    };
  }, [trees]);

  // Apply filters to trees
  const filteredTrees = useMemo(() => {
    return trees.filter(tree => {
      // Date filter
      if (filters.dateRange?.from) {
        const treeDate = tree.submittedDate;
        const from = startOfDay(filters.dateRange.from);
        const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);
        if (!isWithinInterval(treeDate, { start: from, end: to })) {
          return false;
        }
      }
      
      // Tree type filter
      if (filters.treeType && tree.treeType !== filters.treeType) {
        return false;
      }
      
      // Planter name filter (case-insensitive partial match)
      if (filters.planterName) {
        const searchTerm = filters.planterName.toLowerCase();
        const planterName = (tree.submittedBy || 'Anonymous').toLowerCase();
        if (!planterName.includes(searchTerm)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status && (tree.status || 'planted') !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [trees, filters]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTrees}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (trees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <TreePine className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No trees recorded yet</p>
        <p className="text-sm text-muted-foreground/70">Click on the map to add your first tree</p>
      </div>
    );
  }

  // Show timeline view for selected tree
  if (showTimeline && selectedTree) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setShowTimeline(false);
              onDetailClosed?.();
            }}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-forest-light flex items-center justify-center">
            <TreePine className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{selectedTree.treeType || 'Unknown Tree'}</h3>
            <p className="text-xs text-muted-foreground">{selectedTree.submittedBy || 'Anonymous'}</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <MiniTreeMap
            latitude={selectedTree.latitude}
            longitude={selectedTree.longitude}
            status={selectedTree.status}
          />
          <TreeHealthTimeline tree={selectedTree} />
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-forest-light flex items-center justify-center">
            <TreePine className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="font-bold text-foreground">Tree records</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchTrees} className="hover:bg-primary/10">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <TreeListFilters
        filters={filters}
        onFiltersChange={setFilters}
        treeTypes={uniqueTreeTypes}
        planterNames={uniquePlanterNames}
      />

      {filteredTrees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground">No trees match your filters</p>
          <Button variant="link" size="sm" onClick={() => setFilters({ datePreset: 'all', dateRange: undefined, treeType: '', planterName: '', status: '' })} className="text-primary">
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredTrees.length}</span> of {trees.length} trees
            </p>
          </div>
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-2.5 pb-4">
              <AnimatePresence>
                {filteredTrees.map((tree, index) => {
                  const hasLocation = tree.latitude !== 0 && tree.longitude !== 0;
                  const isSelected = selectedTree?.objectId === tree.objectId;
                  
                  return (
                    <motion.div
                      key={tree.objectId}
                      ref={isSelected ? selectedTreeRef : null}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`tree-card ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : ''
                      } ${
                        hasLocation 
                          ? 'cursor-pointer hover:bg-muted/30' 
                          : 'opacity-70'
                      }`}
                      onClick={() => hasLocation && onTreeSelect?.(tree)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          hasLocation 
                            ? 'bg-gradient-to-br from-primary/20 to-accent/10' 
                            : 'bg-muted'
                        }`}>
                          <TreePine className={`w-5 h-5 ${hasLocation ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground truncate">
                                {TREE_TYPE_LABELS[tree.treeType] || tree.treeType || 'Unknown'}
                              </h4>
                              {!hasLocation && (
                                <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50">
                                  <AlertCircle className="w-3 h-3" />
                                  No GPS
                                </Badge>
                              )}
                            </div>
                                            {hasLocation && (
                                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                                            )}
                                          </div>
                                          
                                          {/* Health indicator */}
                                          {tree.healthScore && (
                                            <div 
                                              className="flex items-center gap-1.5 cursor-pointer hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (onTreeSelect) onTreeSelect(tree);
                                                setShowTimeline(true);
                                              }}
                                            >
                                              <Activity className="w-3.5 h-3.5 text-primary" />
                                              <span className="text-xs font-medium text-primary">{tree.healthScore}/10</span>
                                            </div>
                                          )}
                                          
                                          <p className="text-sm text-muted-foreground mt-0.5">
                                            {REASON_LABELS[tree.reason] || tree.reason || 'Not specified'}
                                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-muted-foreground">
                            {hasLocation && (
                              <span className="flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-full">
                                <MapPin className="w-3 h-3 text-primary" />
                                {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground/70" />
                              {tree.submittedBy || 'Anonymous'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground/70" />
                              {formatDate(tree.submittedDate)}
                            </span>
                          </div>
                          
                          {tree.notes && (
                            <p className="mt-2.5 text-sm text-muted-foreground/70 line-clamp-2 italic bg-muted/30 rounded-lg px-3 py-2">
                              "{tree.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
