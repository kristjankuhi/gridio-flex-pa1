import { useState, useCallback, useMemo } from 'react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  isSameDay,
  isBefore,
} from 'date-fns';
import type { TimeWindow, PeriodRange } from '@/types';

export function usePeriodSelector(defaultWindow: TimeWindow = '1D') {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(defaultWindow);
  const [anchor, setAnchor] = useState<Date>(new Date());

  const range = useMemo<PeriodRange>(() => {
    switch (timeWindow) {
      case '1D':
        return {
          start: startOfDay(anchor),
          end: endOfDay(anchor),
          label: isSameDay(anchor, new Date())
            ? `Today, ${format(anchor, 'd MMM yyyy')}`
            : format(anchor, 'EEEE, d MMM yyyy'),
        };
      case '1W': {
        const s = startOfWeek(anchor, { weekStartsOn: 1 });
        const e = endOfWeek(anchor, { weekStartsOn: 1 });
        return {
          start: s,
          end: e,
          label: `Week ${format(s, 'w')}: ${format(s, 'd')}–${format(e, 'd MMM yyyy')}`,
        };
      }
      case '1M':
        return {
          start: startOfMonth(anchor),
          end: endOfMonth(anchor),
          label: format(anchor, 'MMMM yyyy'),
        };
      case '1Y':
        return {
          start: startOfYear(anchor),
          end: endOfYear(anchor),
          label: format(anchor, 'yyyy'),
        };
    }
  }, [timeWindow, anchor]);

  const goNext = useCallback(() => {
    setAnchor((prev) => {
      const next =
        timeWindow === '1D'
          ? addDays(prev, 1)
          : timeWindow === '1W'
            ? addWeeks(prev, 1)
            : timeWindow === '1M'
              ? addMonths(prev, 1)
              : addYears(prev, 1);
      const limit = addYears(new Date(), 1);
      return isBefore(limit, next) ? prev : next;
    });
  }, [timeWindow]);

  const goPrev = useCallback(() => {
    setAnchor((prev) =>
      timeWindow === '1D'
        ? subDays(prev, 1)
        : timeWindow === '1W'
          ? subWeeks(prev, 1)
          : timeWindow === '1M'
            ? subMonths(prev, 1)
            : subYears(prev, 1)
    );
  }, [timeWindow]);

  // true when the "next" button would go beyond 1 year from now
  const isAtPresent = useMemo(() => {
    const limit = addYears(new Date(), 1);
    const next =
      timeWindow === '1D'
        ? addDays(anchor, 1)
        : timeWindow === '1W'
          ? addWeeks(anchor, 1)
          : timeWindow === '1M'
            ? addMonths(anchor, 1)
            : addYears(anchor, 1);
    return isBefore(limit, next);
  }, [anchor, timeWindow]);

  return { timeWindow, setTimeWindow, range, goNext, goPrev, isAtPresent };
}
