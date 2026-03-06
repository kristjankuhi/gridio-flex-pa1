import {
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeWindow } from '@/types';

const WINDOWS: TimeWindow[] = ['1D', '1W', '1M', '1Y'];

interface Shortcut {
  label: string;
  date: Date;
}

function getShortcuts(timeWindow: TimeWindow, today: Date): Shortcut[] {
  switch (timeWindow) {
    case '1D':
      return [
        { label: 'Yest', date: subDays(today, 1) },
        { label: 'Today', date: today },
        { label: 'Tmrw', date: addDays(today, 1) },
      ];
    case '1W':
      return [
        { label: 'Last W', date: subWeeks(today, 1) },
        { label: 'This W', date: today },
        { label: 'Next W', date: addWeeks(today, 1) },
      ];
    case '1M':
      return [
        { label: 'Last M', date: subMonths(today, 1) },
        { label: 'This M', date: today },
        { label: 'Next M', date: addMonths(today, 1) },
      ];
    case '1Y':
      return [
        { label: 'Last Y', date: subYears(today, 1) },
        { label: 'This Y', date: today },
        { label: 'Next Y', date: addYears(today, 1) },
      ];
  }
}

function isShortcutActive(
  anchor: Date,
  shortcutDate: Date,
  timeWindow: TimeWindow
): boolean {
  switch (timeWindow) {
    case '1D':
      return (
        startOfDay(anchor).getTime() === startOfDay(shortcutDate).getTime()
      );
    case '1W':
      return (
        startOfWeek(anchor, { weekStartsOn: 1 }).getTime() ===
        startOfWeek(shortcutDate, { weekStartsOn: 1 }).getTime()
      );
    case '1M':
      return (
        startOfMonth(anchor).getTime() === startOfMonth(shortcutDate).getTime()
      );
    case '1Y':
      return (
        startOfYear(anchor).getTime() === startOfYear(shortcutDate).getTime()
      );
  }
}

interface PeriodSelectorProps {
  timeWindow: TimeWindow;
  label: string;
  anchor: Date;
  isAtPresent: boolean;
  onWindowChange: (w: TimeWindow) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpTo: (date: Date) => void;
}

export function PeriodSelector({
  timeWindow,
  label,
  anchor,
  isAtPresent,
  onWindowChange,
  onPrev,
  onNext,
  onJumpTo,
}: PeriodSelectorProps) {
  const today = new Date();
  const limit = addYears(today, 1);
  const shortcuts = getShortcuts(timeWindow, today);

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
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

        <div className="flex items-center gap-0.5 pl-1">
          {shortcuts.map(({ label: shortcutLabel, date }) => {
            const active = isShortcutActive(anchor, date, timeWindow);
            const disabled = isBefore(limit, date);
            return (
              <button
                key={shortcutLabel}
                onClick={() => onJumpTo(date)}
                disabled={disabled}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary font-medium'
                    : disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {shortcutLabel}
              </button>
            );
          })}
        </div>
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
