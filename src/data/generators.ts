import { addMinutes, startOfDay, subDays, format } from 'date-fns';
import type {
  TimeBlock,
  FleetStats,
  PriceBlock,
  PriceReferenceBlock,
  FlexProduct,
  BidBlock,
  ActivationRecord,
  ActivationBlock,
  SoCBlock,
  LoadShiftBlock,
} from '../types';
import { AREA_EV_COUNTS, AREA_PRICE_FACTOR } from './areaConfig';
import type { MarketArea } from '@/types';

const TOTAL_EVS = 847;

// Seeded pseudo-random for reproducibility in demos
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Belgian DA price — monthly base (EUR/MWh), based on ENTSO-E/EPEX BE historical averages
// Winter high demand + low solar; summer lower demand + high solar
const MONTHLY_BASE_PRICE: Record<number, number> = {
  0: 85, // Jan — cold, low solar
  1: 78, // Feb
  2: 68, // Mar — solar starting
  3: 55, // Apr
  4: 48, // May
  5: 42, // Jun — summer solar peak
  6: 38, // Jul — lowest annual average
  7: 40, // Aug
  8: 55, // Sep — solar fading
  9: 68, // Oct
  10: 80, // Nov
  11: 88, // Dec — cold + low solar
};

// Intraday shape factors per season (multiplier on monthly base)
// Summer: duck curve — solar suppresses midday prices on normal days (low but positive).
// Negative prices are a separate event (~5-6 days/month), handled below.
const SUMMER_SHAPE: Record<number, number> = {
  0: 0.7,
  1: 0.64,
  2: 0.59,
  3: 0.56,
  4: 0.58,
  5: 0.68,
  6: 0.88,
  7: 1.08,
  8: 1.05,
  9: 0.8,
  10: 0.5,
  11: 0.28,
  12: 0.18,
  13: 0.15,
  14: 0.22,
  15: 0.42,
  16: 0.78,
  17: 1.18,
  18: 1.4,
  19: 1.38,
  20: 1.18,
  21: 1.0,
  22: 0.85,
  23: 0.75,
};

// Negative-price day: ~5-6 days/month in summer (≈18% chance per day).
// Uses the calendar day as a stable seed — same day always returns the same result.
function isNegativePriceDay(dayIndex: number, month: number): boolean {
  if (month < 4 || month > 7) return false;
  return seededRandom(dayIndex * 53 + 11) < 0.18;
}

// On a negative-price day, solar hours (10-15) get a strongly negative price.
// Peak at 13:00 (-8 to -55 EUR/MWh); tapers off toward the shoulders.
const NEGATIVE_HOUR_DEPTH: Record<number, number> = {
  10: 0.2,
  11: 0.55,
  12: 0.85,
  13: 1.0,
  14: 0.8,
  15: 0.3,
};
function negativeDayPrice(hour: number, dayIndex: number): number | null {
  const depth = NEGATIVE_HOUR_DEPTH[hour];
  if (depth === undefined) return null;
  // Day-specific peak magnitude: -8 to -55 EUR/MWh
  const peakMagnitude = 8 + seededRandom(dayIndex * 37 + 5) * 47;
  return -(peakMagnitude * depth);
}
// Winter: classic double peak, small midday dip, high night floor
const WINTER_SHAPE: Record<number, number> = {
  0: 0.72,
  1: 0.68,
  2: 0.65,
  3: 0.63,
  4: 0.65,
  5: 0.72,
  6: 0.9,
  7: 1.22,
  8: 1.35,
  9: 1.22,
  10: 1.08,
  11: 1.0,
  12: 0.97,
  13: 0.93,
  14: 0.9,
  15: 0.95,
  16: 1.12,
  17: 1.38,
  18: 1.48,
  19: 1.42,
  20: 1.28,
  21: 1.08,
  22: 0.92,
  23: 0.8,
};
// Spring/Autumn: intermediate, moderate midday dip
const MIDSEASON_SHAPE: Record<number, number> = {
  0: 0.71,
  1: 0.66,
  2: 0.62,
  3: 0.6,
  4: 0.62,
  5: 0.7,
  6: 0.89,
  7: 1.15,
  8: 1.24,
  9: 1.1,
  10: 0.92,
  11: 0.75,
  12: 0.62,
  13: 0.58,
  14: 0.62,
  15: 0.72,
  16: 0.97,
  17: 1.28,
  18: 1.42,
  19: 1.38,
  20: 1.2,
  21: 1.02,
  22: 0.87,
  23: 0.78,
};

// Realistic Belgian DA price: seasonal base × intraday shape × weekend discount
function basePriceForHour(
  hour: number,
  month: number,
  isWeekend: boolean
): number {
  const base = MONTHLY_BASE_PRICE[month] ?? 65;
  const isSummer = month >= 4 && month <= 7;
  const isWinter = month <= 1 || month >= 10;
  const shape = isSummer
    ? SUMMER_SHAPE
    : isWinter
      ? WINTER_SHAPE
      : MIDSEASON_SHAPE;
  const weekendDiscount = isWeekend ? 0.88 : 1.0;
  return base * (shape[hour] ?? 1.0) * weekendDiscount;
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

export function generateFleetStats(area: MarketArea = 'global'): FleetStats {
  const now = new Date();
  const hour = now.getHours();
  const evCount = AREA_EV_COUNTS[area];
  const pluggedInRatio =
    hour >= 22 || hour < 6 ? 0.85 : hour >= 9 && hour < 16 ? 0.4 : 0.65;
  const pluggedInCount = Math.round(evCount * pluggedInRatio);
  const avgSoC = hour >= 22 || hour < 6 ? 78 : hour >= 9 && hour < 16 ? 50 : 65;
  const avgBatteryKwh = 14.7;
  const upHeadroomKw = Math.round(
    pluggedInCount * ((avgSoC - 20) / 100) * avgBatteryKwh * 4
  );
  const downHeadroomKw = Math.round(
    pluggedInCount * ((95 - avgSoC) / 100) * avgBatteryKwh * 4
  );
  return {
    totalCapacityKwh: Math.round(evCount * avgBatteryKwh),
    availableFlexibilityKw: upHeadroomKw,
    activeEvCount: pluggedInCount,
    avgStateOfChargePct: avgSoC,
    upHeadroomKw,
    downHeadroomKw,
  };
}

const AVG_BATTERY_KWH = 14.7; // 12_450 kWh / 847 EVs
const FLEET_SIZE = 847;
const MIN_SOC_BUFFER = 20; // % guaranteed minimum for drivers
const MAX_SOC = 95; // % practical ceiling

function pluggedInRatioForHour(hour: number, isWeekend: boolean): number {
  const weekday: Record<number, number> = {
    0: 0.84,
    1: 0.86,
    2: 0.87,
    3: 0.86,
    4: 0.83,
    5: 0.72,
    6: 0.58,
    7: 0.45,
    8: 0.4,
    9: 0.38,
    10: 0.38,
    11: 0.39,
    12: 0.4,
    13: 0.41,
    14: 0.42,
    15: 0.45,
    16: 0.52,
    17: 0.62,
    18: 0.72,
    19: 0.78,
    20: 0.82,
    21: 0.84,
    22: 0.85,
    23: 0.85,
  };
  const weekend: Record<number, number> = {
    0: 0.75,
    1: 0.76,
    2: 0.77,
    3: 0.76,
    4: 0.74,
    5: 0.7,
    6: 0.65,
    7: 0.58,
    8: 0.52,
    9: 0.48,
    10: 0.46,
    11: 0.45,
    12: 0.46,
    13: 0.47,
    14: 0.48,
    15: 0.52,
    16: 0.58,
    17: 0.65,
    18: 0.7,
    19: 0.74,
    20: 0.76,
    21: 0.77,
    22: 0.76,
    23: 0.76,
  };
  return (isWeekend ? weekend[hour] : weekday[hour]) ?? 0.65;
}

function avgSoCForHour(hour: number, isWeekend: boolean): number {
  const weekday: Record<number, number> = {
    0: 76,
    1: 80,
    2: 82,
    3: 83,
    4: 82,
    5: 78,
    6: 72,
    7: 64,
    8: 57,
    9: 53,
    10: 51,
    11: 50,
    12: 50,
    13: 51,
    14: 52,
    15: 54,
    16: 57,
    17: 61,
    18: 65,
    19: 68,
    20: 71,
    21: 73,
    22: 75,
    23: 76,
  };
  const weekend: Record<number, number> = {
    0: 72,
    1: 75,
    2: 77,
    3: 78,
    4: 77,
    5: 74,
    6: 70,
    7: 65,
    8: 60,
    9: 56,
    10: 54,
    11: 53,
    12: 53,
    13: 54,
    14: 55,
    15: 57,
    16: 60,
    17: 64,
    18: 67,
    19: 70,
    20: 72,
    21: 73,
    22: 73,
    23: 72,
  };
  return (isWeekend ? weekend[hour] : weekday[hour]) ?? 62;
}

export function generateSoCCurve(
  date: Date,
  area: MarketArea = 'global'
): SoCBlock[] {
  const blocks: SoCBlock[] = [];
  let current = startOfDay(date);
  let seed = date.getTime() % 7777;

  for (let i = 0; i < 96; i++) {
    const hour = current.getHours();
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    const pluggedInRatio = pluggedInRatioForHour(hour, isWeekend);
    const plugInNoise = 1 + (seededRandom(seed++) - 0.5) * 0.08;
    const pluggedInCount = Math.round(
      FLEET_SIZE * pluggedInRatio * plugInNoise
    );

    const avgSoC = avgSoCForHour(hour, isWeekend);
    const socNoise = (seededRandom(seed++) - 0.5) * 4;
    const soc = Math.min(
      MAX_SOC,
      Math.max(MIN_SOC_BUFFER + 5, avgSoC + socNoise)
    );

    const upHeadroomKwh = Math.round(
      ((soc - MIN_SOC_BUFFER) / 100) * pluggedInCount * AVG_BATTERY_KWH
    );
    const downHeadroomKwh = Math.round(
      ((MAX_SOC - soc) / 100) * pluggedInCount * AVG_BATTERY_KWH
    );

    blocks.push({
      timestamp: new Date(current),
      avgSoCPct: Math.round(soc * 10) / 10,
      pluggedInCount,
      upHeadroomKwh: Math.max(0, upHeadroomKwh),
      downHeadroomKwh: Math.max(0, downHeadroomKwh),
    });

    current = addMinutes(current, 15);
  }

  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  return blocks.map((b) => ({
    ...b,
    pluggedInCount: Math.round(b.pluggedInCount * scale),
    upHeadroomKwh: b.upHeadroomKwh * scale,
    downHeadroomKwh: b.downHeadroomKwh * scale,
  }));
}

// Internal helper: generates historic load profile.
// applyPriceShift = true  → Gridio-managed load (flexible kWh shifted toward cheap hours)
// applyPriceShift = false → uncontrolled baseline (plug-in-proportional, no price signal)
function generateLoadProfile(
  daysBack: number,
  applyPriceShift: boolean
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const now = new Date();
  const end = now;
  const start = startOfDay(subDays(now, daysBack));

  let current = start;
  let seed = 0;

  while (current < end) {
    const hour = current.getHours();
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const month = current.getMonth();

    const baseLoad = baseLoadKwhForHour(hour, isWeekend);
    const noise = 1 + (seededRandom(seed++) - 0.5) * 0.25;
    const total = baseLoad * noise;
    const flexRatio = 0.62 + seededRandom(seed++) * 0.12;
    const baseFlexKwh = total * flexRatio;
    const nonFlexKwh = total * (1 - flexRatio);

    const dayIndex = Math.floor(current.getTime() / 86400000);
    const negDay = isNegativePriceDay(dayIndex, month);
    const negPrice = negDay ? negativeDayPrice(hour, dayIndex) : null;

    let priceEurMwh: number;
    if (negPrice !== null) {
      const priceNoise = 1 + (seededRandom(seed++) - 0.5) * 0.25;
      priceEurMwh = Math.max(-100, negPrice * priceNoise);
    } else {
      const basePrice = basePriceForHour(hour, month, isWeekend);
      const priceNoise = 1 + (seededRandom(seed++) - 0.5) * 0.15;
      priceEurMwh = Math.max(-100, basePrice * priceNoise);
    }

    let flexibleKwh: number;
    if (applyPriceShift) {
      // Gridio shifts flexible charging toward cheap hours.
      // Reference = daily average price for this month/day-type so that hours above
      // average get reduced load (negative delta) and hours below average get
      // increased load (positive delta) — producing bars in both directions.
      const dailyAvgPrice =
        Array.from({ length: 24 }, (_, h) =>
          basePriceForHour(h, month, isWeekend)
        ).reduce((s, p) => s + p, 0) / 24;
      const refPrice = dailyAvgPrice;
      const effectivePrice = Math.max(5, priceEurMwh); // avoid divide-by-zero on negatives
      const shiftFactor = Math.max(
        0.35,
        Math.min(1.9, (refPrice / effectivePrice) ** 0.45)
      );
      flexibleKwh = Math.max(0, baseFlexKwh * shiftFactor);
    } else {
      flexibleKwh = baseFlexKwh;
    }

    blocks.push({
      timestamp: new Date(current),
      flexibleKwh,
      nonFlexibleKwh: Math.max(0, nonFlexKwh),
      priceEurMwh,
    });

    current = addMinutes(current, 15);
  }

  return blocks;
}

export function generateHistoricLoad(
  daysBack: number,
  area: MarketArea = 'global'
): TimeBlock[] {
  const blocks = generateLoadProfile(daysBack, true);
  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  const priceFactor = AREA_PRICE_FACTOR[area];
  return blocks.map((b) => ({
    ...b,
    flexibleKwh: b.flexibleKwh * scale,
    nonFlexibleKwh: b.nonFlexibleKwh * scale,
    priceEurMwh: b.priceEurMwh * priceFactor,
  }));
}

export function generateBaselineLoad(
  daysBack: number,
  area: MarketArea = 'global'
): TimeBlock[] {
  const blocks = generateLoadProfile(daysBack, false);
  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  const priceFactor = AREA_PRICE_FACTOR[area];
  return blocks.map((b) => ({
    ...b,
    flexibleKwh: b.flexibleKwh * scale,
    nonFlexibleKwh: b.nonFlexibleKwh * scale,
    priceEurMwh: b.priceEurMwh * priceFactor,
  }));
}

export function generateLoadShiftBlocks(
  daysBack: number,
  area: MarketArea = 'global'
): LoadShiftBlock[] {
  const baseline = generateLoadProfile(daysBack, false);
  const managed = generateLoadProfile(daysBack, true);

  const blocks = baseline.map((b, i) => {
    const m = managed[i];
    const baselineTotal = b.flexibleKwh + b.nonFlexibleKwh;
    const actualTotal = m.flexibleKwh + m.nonFlexibleKwh;
    const baselineKwh = Math.round(baselineTotal);
    const actualKwh = Math.round(actualTotal);
    const deltaKwh = actualKwh - baselineKwh;
    const savingsEur =
      ((baselineKwh - actualKwh) * Math.max(0, b.priceEurMwh)) / 1000;
    return {
      timestamp: b.timestamp,
      baselineKwh,
      actualKwh,
      deltaKwh,
      daSpotEurMwh: Math.round(b.priceEurMwh * 10) / 10,
      savingsEur: Math.round(savingsEur * 100) / 100,
    };
  });

  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  const priceFactor = AREA_PRICE_FACTOR[area];
  return blocks.map((b) => ({
    ...b,
    baselineKwh: b.baselineKwh * scale,
    actualKwh: b.actualKwh * scale,
    deltaKwh: b.deltaKwh * scale,
    daSpotEurMwh: b.daSpotEurMwh * priceFactor,
    savingsEur: b.savingsEur * scale * priceFactor,
  }));
}

export function generateForecastLoad(
  daysAhead: number,
  area: MarketArea = 'global'
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const now = new Date();

  // Round up to next 15-min boundary
  const minutesToNext = 15 - (now.getMinutes() % 15);
  let current = addMinutes(now, minutesToNext);
  current.setSeconds(0, 0);

  const end = startOfDay(addMinutes(current, daysAhead * 24 * 60));
  let seed = 9999;
  let blockIndex = 0;

  while (current < end) {
    const hour = current.getHours();
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const month = current.getMonth();

    // Noise grows with distance from now: ±10% near-term up to ±40% at 1 year
    const daysOut = blockIndex / 96;
    const noiseScale = 0.2 + Math.min(0.6, daysOut / 365) * 0.6;

    const baseLoad = baseLoadKwhForHour(hour, isWeekend);
    const noise = 1 + (seededRandom(seed++) - 0.5) * noiseScale;
    const total = baseLoad * noise;
    const flexRatio = 0.65 + seededRandom(seed++) * 0.1;

    const dayIndex = Math.floor(current.getTime() / 86400000);
    const negDay = isNegativePriceDay(dayIndex, month);
    const negPrice = negDay ? negativeDayPrice(hour, dayIndex) : null;

    let priceEurMwh: number;
    if (negPrice !== null) {
      const noise =
        1 + (seededRandom(seed++) - 0.5) * (0.25 + noiseScale * 0.4);
      priceEurMwh = Math.max(-100, negPrice * noise);
    } else {
      const basePrice = basePriceForHour(hour, month, isWeekend);
      const priceNoise =
        1 + (seededRandom(seed++) - 0.5) * (0.18 + noiseScale * 0.5);
      priceEurMwh = Math.max(-100, basePrice * priceNoise);
    }

    blocks.push({
      timestamp: new Date(current),
      flexibleKwh: Math.max(0, total * flexRatio),
      nonFlexibleKwh: Math.max(0, total * (1 - flexRatio)),
      priceEurMwh,
    });

    current = addMinutes(current, 15);
    blockIndex++;
  }

  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  const priceFactor = AREA_PRICE_FACTOR[area];
  return blocks.map((b) => ({
    ...b,
    flexibleKwh: b.flexibleKwh * scale,
    nonFlexibleKwh: b.nonFlexibleKwh * scale,
    priceEurMwh: b.priceEurMwh * priceFactor,
  }));
}

export function generateBasePriceCurve(date: Date): PriceBlock[] {
  const blocks: PriceBlock[] = [];
  let current = startOfDay(date);
  let seed = date.getTime() % 10000;

  const month = date.getMonth();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  for (let i = 0; i < 96; i++) {
    const hour = current.getHours();
    const basePrice = basePriceForHour(hour, month, isWeekend);
    const noise = 1 + (seededRandom(seed++) - 0.5) * 0.12;

    blocks.push({
      timestamp: new Date(current),
      priceEurMwh: Math.max(-100, basePrice * noise),
    });

    current = addMinutes(current, 15);
  }

  return blocks;
}

export function generatePriceReference(
  date: Date,
  area: MarketArea = 'global'
): PriceReferenceBlock[] {
  const blocks: PriceReferenceBlock[] = [];
  let current = startOfDay(date);
  let seed = date.getTime() % 5555;
  const now = new Date();

  const month = date.getMonth();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  for (let i = 0; i < 96; i++) {
    const hour = current.getHours();
    const isForecast = current > now;

    const daBase = basePriceForHour(hour, month, isWeekend);
    const daNoise =
      1 + (seededRandom(seed++) - 0.5) * (isForecast ? 0.18 : 0.1);
    const daSpot = Math.max(-100, daBase * daNoise);

    // ID forecast: DA ± 8–12% spread
    const idSpread = (seededRandom(seed++) - 0.5) * (isForecast ? 0.24 : 0.16);
    const idForecast = daSpot * (1 + idSpread);

    // mFRR reference: DA + €15–35/MWh capacity premium
    const mfrrPremium = 15 + seededRandom(seed++) * 20;
    const mfrrRef = daSpot + mfrrPremium;

    blocks.push({
      timestamp: new Date(current),
      daSpotEurMwh: Math.round(daSpot * 10) / 10,
      idForecastEurMwh: Math.round(idForecast * 10) / 10,
      mfrrRefEurMwh: Math.round(mfrrRef * 10) / 10,
      isForecast,
    });

    current = addMinutes(current, 15);
  }

  const priceFactor = AREA_PRICE_FACTOR[area];
  return blocks.map((b) => ({
    ...b,
    daSpotEurMwh: b.daSpotEurMwh * priceFactor,
    idForecastEurMwh: b.idForecastEurMwh * priceFactor,
    mfrrRefEurMwh: b.mfrrRefEurMwh * priceFactor,
  }));
}

interface ProductDefaults {
  typicalWindow: [number, number]; // hour range [start, end)
  capacityPriceRange: [number, number]; // €/MW/h
  energyPriceRange: [number, number]; // €/MWh
  typicalMw: number;
}

const PRODUCT_DEFAULTS: Record<FlexProduct, ProductDefaults> = {
  fcr: {
    typicalWindow: [0, 24],
    capacityPriceRange: [8, 15],
    energyPriceRange: [0, 0],
    typicalMw: 0.5,
  },
  afrr: {
    typicalWindow: [6, 22],
    capacityPriceRange: [5, 10],
    energyPriceRange: [30, 80],
    typicalMw: 1.0,
  },
  mfrr: {
    typicalWindow: [6, 22],
    capacityPriceRange: [3, 8],
    energyPriceRange: [60, 120],
    typicalMw: 1.5,
  },
  'id-balancing': {
    typicalWindow: [8, 20],
    capacityPriceRange: [2, 5],
    energyPriceRange: [40, 90],
    typicalMw: 0.8,
  },
};

export function generateBidTimeline(date: Date): BidBlock[] {
  const blocks: BidBlock[] = [];
  let seed = date.getTime() % 3333;

  // FCR and aFRR excluded from prototype — fleet response time (p90: 8.6–9.4 min)
  // is incompatible with FCR (<30s) and aFRR (<5 min) requirements.
  const products: FlexProduct[] = ['mfrr', 'id-balancing'];

  for (const product of products) {
    const defaults = PRODUCT_DEFAULTS[product];
    let current = startOfDay(date);
    const [windowStart, windowEnd] = defaults.typicalWindow;

    const actualStart = windowStart + Math.floor(seededRandom(seed++) * 2);
    const actualEnd = windowEnd - Math.floor(seededRandom(seed++) * 2);
    const reservedMw = defaults.typicalMw * (0.8 + seededRandom(seed++) * 0.4);
    const [capMin, capMax] = defaults.capacityPriceRange;
    const capacityPrice = capMin + seededRandom(seed++) * (capMax - capMin);
    const [enMin, enMax] = defaults.energyPriceRange;
    const energyPrice = enMin + seededRandom(seed++) * (enMax - enMin);

    for (let i = 0; i < 96; i++) {
      const hour = current.getHours();
      const isAvailable = hour >= actualStart && hour < actualEnd;
      blocks.push({
        timestamp: new Date(current),
        product,
        reservedMw: Math.round(reservedMw * 100) / 100,
        capacityPriceEurMwH: Math.round(capacityPrice * 100) / 100,
        energyPriceEurMwh: Math.round(energyPrice * 100) / 100,
        isAvailable,
      });
      current = addMinutes(current, 15);
    }
  }
  return blocks;
}

export function formatBlockTime(date: Date): string {
  return format(date, 'HH:mm');
}

export interface MarketSplitStats {
  daLoadKwh: number;
  daSavingsEur: number;
  idAdjustmentsKwh: number;
  idSavingsEur: number;
  mfrrUpKwh: number;
  mfrrDownKwh: number;
  mfrrRevenueEur: number;
  mfrrDeliveryRatePct: number;
}

export function generateMarketSplitStats(
  range: {
    start: Date;
    end: Date;
  },
  area: MarketArea = 'global'
): MarketSplitStats {
  const seed = range.start.getTime() % 9999;
  const daLoad = 8400 + seededRandom(seed) * 2000;
  const daSavings = daLoad * 0.018 * (45 + seededRandom(seed + 1) * 20);
  const idAdj = daLoad * 0.15 * (1 + (seededRandom(seed + 2) - 0.5) * 0.3);
  const idSavings = idAdj * 0.022 * (50 + seededRandom(seed + 3) * 15);
  const stats = {
    daLoadKwh: Math.round(daLoad),
    daSavingsEur: Math.round(daSavings / 1000),
    idAdjustmentsKwh: Math.round(idAdj),
    idSavingsEur: Math.round(idSavings / 1000),
    mfrrUpKwh: Math.round(daLoad * 0.04),
    mfrrDownKwh: Math.round(daLoad * 0.08),
    mfrrRevenueEur: Math.round(daLoad * 0.012),
    mfrrDeliveryRatePct: Math.round(82 + seededRandom(seed + 4) * 12),
  };
  const scale = AREA_EV_COUNTS[area] / TOTAL_EVS;
  const priceFactor = AREA_PRICE_FACTOR[area];
  return {
    daLoadKwh: Math.round(stats.daLoadKwh * scale),
    daSavingsEur: Math.round(stats.daSavingsEur * scale * priceFactor),
    idAdjustmentsKwh: Math.round(stats.idAdjustmentsKwh * scale),
    idSavingsEur: Math.round(stats.idSavingsEur * scale * priceFactor),
    mfrrUpKwh: Math.round(stats.mfrrUpKwh * scale),
    mfrrDownKwh: Math.round(stats.mfrrDownKwh * scale),
    mfrrRevenueEur: Math.round(stats.mfrrRevenueEur * scale * priceFactor),
    mfrrDeliveryRatePct: stats.mfrrDeliveryRatePct,
  };
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
      const product: FlexProduct = isMfrr ? 'mfrr' : 'id-balancing';
      const direction: 'up' | 'down' =
        seededRandom(seed++) > 0.5 ? 'up' : 'down';
      const durationMin = isMfrr
        ? 30
        : 60 + Math.floor(seededRandom(seed++) * 120);
      const numBlocks = Math.round(durationMin / 15);

      // Bid economics (declared before baselinePerBlock — reservedMw needed for mFRR baseline)
      const reservedMw = isMfrr ? 1 + seededRandom(seed++) * 1.5 : 0;
      const capacityPriceEurMwH = isMfrr ? 4 + seededRandom(seed++) * 4 : 0;

      // For mFRR: baseline energy must be consistent with the reserved MW capacity.
      // reservedMw × 1000 kW × 0.25h = kWh per 15-min block. Add ±10% noise.
      const baselinePerBlock = isMfrr
        ? reservedMw * 1000 * 0.25 * (1 + (seededRandom(seed++) - 0.5) * 0.2)
        : 60 + seededRandom(seed++) * 80;

      // shiftRatio sign MUST match direction: up → reduce load → negative, down → increase → positive
      const shiftMagnitude = 0.25 + seededRandom(seed++) * 0.35;
      const shiftRatio = direction === 'up' ? -shiftMagnitude : shiftMagnitude;
      const energyBidPrice = isMfrr
        ? 60 + seededRandom(seed++) * 60
        : 40 + seededRandom(seed++) * 40;
      const imbalancePriceEurMwh = 80;

      // Delivery rate: 85-100%
      const deliveryRate = 0.85 + seededRandom(seed++) * 0.15;
      const requestedKw = isMfrr ? Math.round(reservedMw * 1000) : null;
      const deliveredKw = isMfrr
        ? Math.round(requestedKw! * deliveryRate)
        : null;

      const blockData: ActivationBlock[] = Array.from(
        { length: numBlocks },
        (_, bi) => {
          const bts = new Date(ts.getTime() + bi * 15 * 60000);
          const baseline =
            baselinePerBlock * (1 + (seededRandom(seed++) - 0.5) * 0.2);
          const delta = baseline * shiftRatio * deliveryRate;
          const actual = Math.max(0, baseline + delta);

          const capPay = isMfrr
            ? reservedMw * capacityPriceEurMwH * (15 / 60)
            : 0;
          const energyPay = (energyBidPrice * Math.abs(delta)) / 1000;
          const undeliveredKwh =
            deliveryRate < 0.95
              ? Math.abs(baseline * shiftRatio) * (1 - deliveryRate)
              : 0;
          const imbalanceCost = (imbalancePriceEurMwh * undeliveredKwh) / 1000;

          return {
            timestamp: bts,
            baselineKwh: baseline,
            actualKwh: actual,
            deltaKwh: delta,
            priceEurMwh: energyBidPrice,
            capacityPaymentEur: capPay,
            energyPaymentEur: energyPay,
            imbalanceCostEur: imbalanceCost,
            valueEur: capPay + energyPay - imbalanceCost,
          };
        }
      );

      const totalBaseline = blockData.reduce((s, b) => s + b.baselineKwh, 0);
      const totalActual = blockData.reduce((s, b) => s + b.actualKwh, 0);
      const totalCap = blockData.reduce((s, b) => s + b.capacityPaymentEur, 0);
      const totalEnergy = blockData.reduce((s, b) => s + b.energyPaymentEur, 0);
      const totalImbalance = blockData.reduce(
        (s, b) => s + b.imbalanceCostEur,
        0
      );

      records.push({
        id: `act_${d}_${i}`,
        timestamp: ts,
        product,
        direction: isMfrr ? direction : null,
        requestedKw,
        deliveredKw,
        durationMin,
        baselineKwh: totalBaseline,
        actualKwh: totalActual,
        shiftedKwh: totalActual - totalBaseline,
        capacityPaymentEur: totalCap,
        energyPaymentEur: totalEnergy,
        imbalanceCostEur: totalImbalance,
        revenueEur: totalCap + totalEnergy - totalImbalance,
        blocks: blockData,
      });
    }
  }
  return records;
}
