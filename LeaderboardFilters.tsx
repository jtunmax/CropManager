import { motion } from 'framer-motion';
import { Filter, Calendar, MapPin, TreePine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface LeaderboardFilters {
  month: string | null;
  neighborhood: string | null;
  treeType: string | null;
}

interface LeaderboardFiltersProps {
  filters: LeaderboardFilters;
  onFiltersChange: (filters: LeaderboardFilters) => void;
  availableMonths: string[];
  availableNeighborhoods: string[];
  availableTreeTypes: string[];
}

const TREE_TYPE_LABELS: Record<string, string> = {
  mahogany: 'Mahogany',
  cedar: 'Spanish Cedar',
  ceiba: 'Ceiba (Cotton Tree)',
  cohune: 'Cohune Palm',
  mangrove: 'Mangrove',
  neem: 'Neem',
  coconut: 'Coconut Palm',
  breadfruit: 'Breadfruit',
  mango: 'Mango',
  citrus: 'Citrus',
  avocado: 'Avocado',
  cacao: 'Cacao',
  cashew: 'Cashew',
  soursop: 'Soursop',
  guanacaste: 'Guanacaste',
  santa_maria: 'Santa Maria',
  sapodilla: 'Sapodilla',
  calabash: 'Calabash',
  pine: 'Caribbean Pine',
  bamboo: 'Bamboo',
  fruit: 'Fruit Tree',
  native: 'Native Species',
  other: 'Other',
};

export function LeaderboardFiltersComponent({ 
  filters, 
  onFiltersChange, 
  availableMonths,
  availableNeighborhoods,
  availableTreeTypes,
}: LeaderboardFiltersProps) {
  const activeFilterCount = [filters.month, filters.neighborhood, filters.treeType].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({ month: null, neighborhood: null, treeType: null });
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filter Leaderboard</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    Clear all
                  </Button>
                )}
              </div>

              {/* Month filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Month
                </label>
                <Select
                  value={filters.month || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, month: v === 'all' ? null : v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonth(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Neighborhood filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Neighborhood
                </label>
                <Select
                  value={filters.neighborhood || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, neighborhood: v === 'all' ? null : v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All areas</SelectItem>
                    {availableNeighborhoods.map((hood) => (
                      <SelectItem key={hood} value={hood}>
                        {hood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tree type filter */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TreePine className="w-3 h-3" />
                  Tree Type
                </label>
                <Select
                  value={filters.treeType || 'all'}
                  onValueChange={(v) => onFiltersChange({ ...filters, treeType: v === 'all' ? null : v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {availableTreeTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TREE_TYPE_LABELS[type] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filter badges */}
        {activeFilterCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-1"
          >
            {filters.month && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {formatMonth(filters.month)}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, month: null })}
                />
              </Badge>
            )}
            {filters.neighborhood && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {filters.neighborhood}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, neighborhood: null })}
                />
              </Badge>
            )}
            {filters.treeType && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {TREE_TYPE_LABELS[filters.treeType] || filters.treeType}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, treeType: null })}
                />
              </Badge>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
