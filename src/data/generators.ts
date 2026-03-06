import { addMinutes, startOfDay, subDays, format } from 'date-fns';
import type { TimeBlock, FleetStats, PriceBlock } from '../types';

// Seeded pseudo-random for reproducibility in demos
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Day-ahead price shape: low at night, peak morning + evening
function basePriceForHour(hour: number): number {
  const profile: Record<number, number> = {
    0: 32,
    1: 28,
    2: 25,
    3: 24,
    4: 24,
    5: 28,
    6: 45,
    7: 68,
    8: 75,
    9: 70,
    10: 62,
    11: 58,
    12: 55,
    13: 52,
    14: 50,
    15: 53,
    16: 60,
    17: 78,
    18: 95,
    19: 88,
    20: 72,
    21: 60,
    22: 48,
    23: 38,
  };
  return profile[hour] ?? 50;
}

// Charging load shape: high overnight (22:00–06:00), low midday
function baseLoadKwhForHour(hour: number, isWeekend: boolean): number {
  const weekday: Record<number, number> = {
    0: 85,
    1: 90,
    2: 92,
    3: 88,
    4: 80,
    5: 60,
    6: 35,
    7: 25,
    8: 20,
    9: 18,
    10: 20,
    11: 22,
    12: 25,
    13: 22,
    14: 20,
    15: 22,
    16: 28,
    17: 40,
    18: 55,
    19: 65,
    20: 75,
    21: 82,
    22: 88,
    23: 86,
  };
  const weekend: Record<number, number> = {
    0: 70,
    1: 75,
    2: 78,
    3: 72,
    4: 65,
    5: 55,
    6: 45,
    7: 38,
    8: 32,
    9: 28,
    10: 25,
    11: 25,
    12: 28,
    13: 28,
    14: 30,
    15: 35,
    16: 42,
    17: 50,
    18: 60,
    19: 68,
    20: 72,
    21: 72,
    22: 70,
    23: 68,
  };
  return (isWeekend ? weekend[hour] : weekday[hour]) ?? 50;
}

export function generateFleetStats(): FleetStats {
  return {
    totalCapacityKwh: 12_450,
    availableFlexibilityKw: 3_280,
    activeEvCount: 847,
    avgStateOfChargePct: 62,
  };
}

export function generateHistoricLoad(daysBack: number): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const now = new Date();
  const end = startOfDay(now); // stop at midnight today — gives exactly daysBack * 96 blocks
  const start = startOfDay(subDays(now, daysBack));

  let current = start;
  let seed = 0;

  while (current < end) {
    const hour = current.getHours();
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseLoad = baseLoadKwhForHour(hour, isWeekend);
    const noise = 1 + (seededRandom(seed++) - 0.5) * 0.25;
    const total = baseLoad * noise;
    const flexRatio = 0.62 + seededRandom(seed++) * 0.12;

    const basePrice = basePriceForHour(hour);
    const priceNoise = 1 + (seededRandom(seed++) - 0.5) * 0.15;

    blocks.push({
      timestamp: new Date(current),
      flexibleKwh: Math.max(0, total * flexRatio),
      nonFlexibleKwh: Math.max(0, total * (1 - flexRatio)),
      priceEurMwh: Math.max(0, basePrice * priceNoise),
    });

    current = addMinutes(current, 15);
  }

  return blocks;
}

export function generateForecastLoad(daysAhead: number): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const now = new Date();

  // Round up to next 15-min boundary
  const minutesToNext = 15 - (now.getMinutes() % 15);
  let current = addMinutes(now, minutesToNext);
  current.setSeconds(0, 0);

  const end = startOfDay(addMinutes(current, daysAhead * 24 * 60));
  let seed = 9999;

  while (current < end) {
    const hour = current.getHours();
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseLoad = baseLoadKwhForHour(hour, isWeekend);
    const noise = 1 + (seededRandom(seed++) - 0.5) * 0.2;
    const total = baseLoad * noise;
    const flexRatio = 0.65 + seededRandom(seed++) * 0.1;

    const basePrice = basePriceForHour(hour);
    const priceNoise = 1 + (seededRandom(seed++) - 0.5) * 0.18;

    blocks.push({
      timestamp: new Date(current),
      flexibleKwh: Math.max(0, total * flexRatio),
      nonFlexibleKwh: Math.max(0, total * (1 - flexRatio)),
      priceEurMwh: Math.max(0, basePrice * priceNoise),
    });

    current = addMinutes(current, 15);
  }

  return blocks;
}

export function generateBasePriceCurve(date: Date): PriceBlock[] {
  const blocks: PriceBlock[] = [];
  let current = startOfDay(date);
  let seed = date.getTime() % 10000;

  for (let i = 0; i < 96; i++) {
    const hour = current.getHours();
    const basePrice = basePriceForHour(hour);
    const noise = 1 + (seededRandom(seed++) - 0.5) * 0.12;

    blocks.push({
      timestamp: new Date(current),
      priceEurMwh: Math.max(0, basePrice * noise),
    });

    current = addMinutes(current, 15);
  }

  return blocks;
}

export function formatBlockTime(date: Date): string {
  return format(date, 'HH:mm');
}
