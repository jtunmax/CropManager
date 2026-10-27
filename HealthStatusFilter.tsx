import { Filter, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TreeStatus, getStatusEmoji, getStatusLabel } from '@/services/healthService';

const STATUSES: TreeStatus[] = ['planted', 'alive', 'needs_care', 'dead'];

interface HealthStatusFilterProps {
  value: string; // '' = all statuses
  onChange: (value: string) => void;
}

export function HealthStatusFilter({ value, onChange }: HealthStatusFilterProps) {
  const isActive = value !== '';

  const currentLabel = () => {
    if (!isActive) return 'Status';
    const status = value as TreeStatus;
    return `${getStatusLabel(status)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          className={`gap-1.5 h-9 px-3 shadow-lg backdrop-blur-sm ${
            isActive ? '' : 'bg-card/95 hover:bg-card'
          }`}
          title="Filter trees by health status"
        >
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">{currentLabel()}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => onChange('')} className="gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span>All Statuses</span>
          {!isActive && <Check className="ml-auto w-3 h-3 text-primary" />}
        </DropdownMenuItem>
        {STATUSES.map((status) => (
          <DropdownMenuItem key={status} onClick={() => onChange(status)} className="gap-2">
            <span className="text-base leading-none">{getStatusEmoji(status)}</span>
            <span>{getStatusLabel(status)}</span>
            {value === status && <Check className="ml-auto w-3 h-3 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
