import { useState } from 'react';
import { Calendar as CalendarIcon, Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface TreeFilters {
  datePreset: string;
  dateRange: DateRange | undefined;
  treeType: string;
  planterName: string;
  status: string;
}

interface TreeListFiltersProps {
  filters: TreeFilters;
  onFiltersChange: (filters: TreeFilters) => void;
  treeTypes: string[];
  planterNames: string[];
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
  other: 'Other',
};

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export function TreeListFilters({ filters, onFiltersChange, treeTypes, planterNames }: TreeListFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (preset: string) => {
    let dateRange: DateRange | undefined;
    
    if (preset === 'today') {
      const today = new Date();
      dateRange = { from: startOfDay(today), to: endOfDay(today) };
    } else if (preset === '7days') {
      dateRange = { from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) };
    } else if (preset === '30days') {
      dateRange = { from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) };
    } else if (preset === 'custom') {
      setIsCalendarOpen(true);
      dateRange = filters.dateRange;
    } else {
      dateRange = undefined;
    }

    onFiltersChange({ ...filters, datePreset: preset, dateRange });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ ...filters, datePreset: 'custom', dateRange: range });
  };

  const handleTreeTypeChange = (value: string) => {
    onFiltersChange({ ...filters, treeType: value === 'all' ? '' : value });
  };

  const handlePlanterChange = (value: string) => {
    onFiltersChange({ ...filters, planterName: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value === 'all' ? '' : value });
  };

  const clearFilters = () => {
    onFiltersChange({
      datePreset: 'all',
      dateRange: undefined,
      treeType: '',
      planterName: '',
      status: '',
    });
  };

  const activeFilterCount = [
    filters.datePreset !== 'all',
    filters.treeType,
    filters.planterName,
    filters.status,
  ].filter(Boolean).length;

  const formatDateRange = () => {
    if (!filters.dateRange?.from) return 'Select dates';
    if (!filters.dateRange.to) return format(filters.dateRange.from, 'MMM d, yyyy');
    return `${format(filters.dateRange.from, 'MMM d')} - ${format(filters.dateRange.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-2">
        {/* Date Preset Select */}
        <Select value={filters.datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <CalendarIcon className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {filters.datePreset === 'custom' && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Tree Type Filter */}
        <Select value={filters.treeType || 'all'} onValueChange={handleTreeTypeChange}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Tree Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {treeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {TREE_TYPE_LABELS[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Planter Name Search */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search planter..."
            value={filters.planterName}
            onChange={(e) => handlePlanterChange(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planted">🌱 Planted</SelectItem>
            <SelectItem value="alive">🌿 Alive</SelectItem>
            <SelectItem value="needs_care">⚠️ Needs Care</SelectItem>
            <SelectItem value="dead">💀 Dead</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.datePreset !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1">
              <CalendarIcon className="w-3 h-3" />
              {filters.datePreset === 'custom' ? formatDateRange() : DATE_PRESETS.find(p => p.value === filters.datePreset)?.label}
            </Badge>
          )}
          {filters.treeType && (
            <Badge variant="secondary" className="text-xs">
              {TREE_TYPE_LABELS[filters.treeType] || filters.treeType}
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status === 'needs_care' ? 'Needs Care' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
            </Badge>
          )}
          {filters.planterName && (
            <Badge variant="secondary" className="text-xs">
              Planter: {filters.planterName}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
