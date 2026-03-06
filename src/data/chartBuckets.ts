import {
  addMinutes,
  addDays,
  addMonths,
  format,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import type { PeriodRange, TimeWindow } from '@/types';

/**
 * Returns the ordered list of x-axis labels for the given range and time window.
 * Both FleetChart and FlexibilityImpact use this to guarantee identical bucket ordering and count.
 */
export function buildTimeBuckets(
  range: PeriodRange,
  timeWindow: TimeWindow
): string[] {
  const labels: string[] = [];

  if (timeWindow === '1D') {
    let cur = new Date(range.start);
    while (cur <= range.end) {
      labels.push(format(cur, 'HH:mm'));
      cur = addMinutes(cur, 15);
    }
    return labels;
  }

  if (timeWindow === '1W') {
    let cur = new Date(range.start);
    cur.setMinutes(0, 0, 0);
    cur.setHours(Math.floor(cur.getHours() / 6) * 6);
    while (cur <= range.end) {
      labels.push(format(cur, 'EEE HH:mm'));
      cur = addMinutes(cur, 6 * 60);
    }
    return labels;
  }

  if (timeWindow === '1M') {
    let cur = startOfDay(range.start);
    while (cur <= range.end) {
      labels.push(format(cur, 'd MMM'));
      cur = addDays(cur, 1);
    }
    return labels;
  }

  // '1Y'
  let cur = startOfMonth(range.start);
  while (cur <= range.end) {
    labels.push(format(cur, 'MMM yyyy'));
    cur = addMonths(cur, 1);
  }
  return labels;
}

/**
 * Returns the bucket label for a given timestamp and time window —
 * matches the logic in FleetChart's getBucketKey/label generation.
 */
export function getBucketLabel(
  timestamp: Date,
  timeWindow: TimeWindow
): string {
  if (timeWindow === '1D') return format(timestamp, 'HH:mm');

  if (timeWindow === '1W') {
    const s = new Date(timestamp);
    s.setMinutes(0, 0, 0);
    s.setHours(Math.floor(s.getHours() / 6) * 6);
    return format(s, 'EEE HH:mm');
  }

  if (timeWindow === '1M') return format(timestamp, 'd MMM');

  return format(timestamp, 'MMM yyyy');
}
