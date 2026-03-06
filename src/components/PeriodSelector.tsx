import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeWindow } from '@/types';

const WINDOWS: TimeWindow[] = ['1D', '1W', '1M', '1Y'];

interface PeriodSelectorProps {
  timeWindow: TimeWindow;
  label: string;
  isAtPresent: boolean;
  onWindowChange: (w: TimeWindow) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PeriodSelector({
  timeWindow,
  label,
  isAtPresent,
  onWindowChange,
  onPrev,
  onNext,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-56 text-center">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={isAtPresent}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1 bg-muted rounded-md p-1">
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => onWindowChange(w)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              timeWindow === w
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
