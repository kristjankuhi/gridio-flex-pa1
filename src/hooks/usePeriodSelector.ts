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
    const now = new Date();
    setAnchor((prev) => {
      const next =
        timeWindow === '1D'
          ? addDays(prev, 1)
          : timeWindow === '1W'
            ? addWeeks(prev, 1)
            : timeWindow === '1M'
              ? addMonths(prev, 1)
              : addYears(prev, 1);
      return next > now ? prev : next;
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

  const isAtPresent = useMemo(() => {
    const now = new Date();
    return timeWindow === '1D'
      ? isSameDay(anchor, now)
      : timeWindow === '1W'
        ? isSameDay(
            startOfWeek(anchor, { weekStartsOn: 1 }),
            startOfWeek(now, { weekStartsOn: 1 })
          )
        : timeWindow === '1M'
          ? format(anchor, 'yyyy-MM') === format(now, 'yyyy-MM')
          : format(anchor, 'yyyy') === format(now, 'yyyy');
  }, [anchor, timeWindow]);

  return { timeWindow, setTimeWindow, range, goNext, goPrev, isAtPresent };
}
