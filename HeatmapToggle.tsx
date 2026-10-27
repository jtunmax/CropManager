import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, MapPin, ChevronDown, Heart, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type HeatmapMode = 'off' | 'all' | 'healthy';

interface HeatmapToggleProps {
  mode: HeatmapMode;
  onModeChange: (mode: HeatmapMode) => void;
}

export function HeatmapToggle({ mode, onModeChange }: HeatmapToggleProps) {
  const isHeatmapOn = mode !== 'off';

  const getModeLabel = () => {
    switch (mode) {
      case 'all': return 'All Trees';
      case 'healthy': return 'Healthy Only';
      default: return 'Markers';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'all': return <Flame className="w-4 h-4" />;
      case 'healthy': return <Heart className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isHeatmapOn ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 h-9 px-3 shadow-lg backdrop-blur-sm ${
              isHeatmapOn 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0' 
                : 'bg-card/95 hover:bg-card'
            }`}
          >
            {getModeIcon()}
            <span className="text-xs font-medium hidden sm:inline">{getModeLabel()}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuItem 
            onClick={() => onModeChange('off')}
            className="gap-2"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>Tree Markers</span>
            {mode === 'off' && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onModeChange('all')}
            className="gap-2"
          >
            <TreePine className="w-4 h-4 text-orange-500" />
            <span>Heatmap: All Trees</span>
            {mode === 'all' && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onModeChange('healthy')}
            className="gap-2"
          >
            <Heart className="w-4 h-4 text-green-500" />
            <span>Heatmap: Healthy</span>
            {mode === 'healthy' && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
