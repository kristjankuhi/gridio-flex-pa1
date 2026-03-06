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

export interface ActivationRecord {
  id: string;
  timestamp: Date;
  type: 'price-curve' | 'mfrr';
  direction: 'up' | 'down' | null;
  requestedKw: number | null;
  deliveredKw: number | null;
  durationMin: number;
  baselineKwh: number;
  actualKwh: number;
  shiftedKwh: number;
  revenueEur: number;
  blocks: Array<{
    timestamp: Date;
    baselineKwh: number;
    actualKwh: number;
    deltaKwh: number;
    priceEurMwh: number;
    valueEur: number;
  }>;
}

export function generateActivationHistory(
  daysBack: number
): ActivationRecord[] {
  const records: ActivationRecord[] = [];
  const now = new Date();
  let seed = 42;

  for (let d = daysBack; d >= 0; d--) {
    const day = subDays(now, d);
    const count = 2 + Math.floor(seededRandom(seed++) * 3);
    for (let i = 0; i < count; i++) {
      const hour = 6 + Math.floor(seededRandom(seed++) * 16);
      const ts = new Date(day);
      ts.setHours(hour, 0, 0, 0);
      if (ts > now) continue;

      const isMfrr = seededRandom(seed++) > 0.5;
      const direction: 'up' | 'down' =
        seededRandom(seed++) > 0.5 ? 'down' : 'up';
      const durationMin = isMfrr
        ? 30
        : 60 + Math.floor(seededRandom(seed++) * 120);
      const numBlocks = Math.round(durationMin / 15);
      const baselinePerBlock = 60 + seededRandom(seed++) * 80;
      const shiftRatio =
        (0.3 + seededRandom(seed++) * 0.4) * (direction === 'down' ? -1 : 1);
      const price = 40 + seededRandom(seed++) * 60;

      const blockData = Array.from({ length: numBlocks }, (_, bi) => {
        const bts = new Date(ts.getTime() + bi * 15 * 60000);
        const baseline =
          baselinePerBlock * (1 + (seededRandom(seed++) - 0.5) * 0.2);
        const delta = baseline * shiftRatio;
        const actual = Math.max(0, baseline + delta);
        const value = Math.abs(delta) * (price / 1000) * (isMfrr ? 2.5 : 1);
        return {
          timestamp: bts,
          baselineKwh: baseline,
          actualKwh: actual,
          deltaKwh: delta,
          priceEurMwh: price,
          valueEur: value,
        };
      });

      const totalBaseline = blockData.reduce((s, b) => s + b.baselineKwh, 0);
      const totalActual = blockData.reduce((s, b) => s + b.actualKwh, 0);
      const totalRevenue = blockData.reduce((s, b) => s + b.valueEur, 0);

      records.push({
        id: `act_${d}_${i}`,
        timestamp: ts,
        type: isMfrr ? 'mfrr' : 'price-curve',
        direction: isMfrr ? direction : null,
        requestedKw: isMfrr
          ? 1000 + Math.round(seededRandom(seed++) * 1500)
          : null,
        deliveredKw: isMfrr
          ? Math.round((1000 + seededRandom(seed++) * 1500) * 0.85)
          : null,
        durationMin,
        baselineKwh: totalBaseline,
        actualKwh: totalActual,
        shiftedKwh: totalActual - totalBaseline,
        revenueEur: totalRevenue,
        blocks: blockData,
      });
    }
  }
  return records;
}
