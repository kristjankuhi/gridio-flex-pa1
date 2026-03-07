import type { MarketArea } from '@/types';

/** energy-charts.info bzn parameter for each non-global area */
export const AREA_BZN: Record<Exclude<MarketArea, 'global'>, string> = {
  BE: 'BE',
  NL: 'NL',
  'DE-LU': 'DE-LU',
  FR: 'FR',
  GB: 'GB',
  DK1: 'DK1',
  DK2: 'DK2',
  FI: 'FI',
  NO2: 'NO2',
  SE3: 'SE3',
  EE: 'EE',
  LV: 'LV',
  LT: 'LT',
};

/**
 * Simulated EV fleet size per area. Specific areas sum to 847.
 * Fleet distribution is simulated for prototype purposes — see PRD addendum.
 */
export const AREA_EV_COUNTS: Record<MarketArea, number> = {
  global: 847,
  BE: 338,
  NL: 215,
  'DE-LU': 125,
  FR: 82,
  GB: 42,
  DK1: 16,
  DK2: 9,
  FI: 8,
  NO2: 5,
  SE3: 3,
  EE: 2,
  LV: 1,
  LT: 1,
};

/**
 * Synthetic DA price multiplier relative to the BE model.
 * Applied to generated prices when real API data is unavailable.
 * Documented as simulated in PRD addendum.
 */
export const AREA_PRICE_FACTOR: Record<MarketArea, number> = {
  global: 0.91,
  BE: 1.0,
  NL: 1.05,
  'DE-LU': 0.92,
  FR: 0.82,
  GB: 1.15,
  DK1: 0.75,
  DK2: 0.78,
  FI: 0.68,
  NO2: 0.55,
  SE3: 0.65,
  EE: 0.85,
  LV: 0.88,
  LT: 0.9,
};

/** Display label for each area */
export const AREA_LABEL: Record<MarketArea, string> = {
  global: 'Global',
  BE: 'BE',
  NL: 'NL',
  'DE-LU': 'DE/LU',
  FR: 'FR',
  GB: 'GB',
  DK1: 'DK1',
  DK2: 'DK2',
  FI: 'FI',
  NO2: 'NO2',
  SE3: 'SE3',
  EE: 'EE',
  LV: 'LV',
  LT: 'LT',
};

/** Grouped for the UI selector */
export const AREA_GROUPS: { label: string; areas: MarketArea[] }[] = [
  { label: 'Aggregate', areas: ['global'] },
  { label: 'CWE', areas: ['BE', 'NL', 'DE-LU', 'FR', 'GB'] },
  { label: 'Nordic', areas: ['DK1', 'DK2', 'FI', 'NO2', 'SE3'] },
  { label: 'Baltic', areas: ['EE', 'LV', 'LT'] },
];

export const ALL_AREAS: MarketArea[] = AREA_GROUPS.flatMap((g) => g.areas);
