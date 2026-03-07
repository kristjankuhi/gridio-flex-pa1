export interface TimeBlock {
  timestamp: Date; // start of 15-min block
  flexibleKwh: number;
  nonFlexibleKwh: number;
  priceEurMwh: number; // artificial internal price in Flex 1.0; reference price in Flex 2.0
}

export interface FleetStats {
  totalCapacityKwh: number;
  availableFlexibilityKw: number;
  activeEvCount: number;
  avgStateOfChargePct: number;
  upHeadroomKw: number;
  downHeadroomKw: number;
}

export interface PriceBlock {
  timestamp: Date;
  priceEurMwh: number;
}

export interface PriceCurveVersion {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: Date;
  blocks: PriceBlock[]; // sparse — only edited blocks
  summary: string;
  isActive: boolean;
}

export type TimeWindow = '1D' | '1W' | '1M' | '1Y';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

export interface SimulationResult {
  baseline: TimeBlock[];
  projected: TimeBlock[];
}

// --- SoC dynamics ---

export interface SoCBlock {
  timestamp: Date;
  avgSoCPct: number;
  pluggedInCount: number;
  upHeadroomKwh: number;
  downHeadroomKwh: number;
  dynamicFloorPct: number; // rises toward departure time (20% → 80%)
}

// --- Flex 2.0 product types ---

export type FlexProduct = 'fcr' | 'afrr' | 'mfrr' | 'id-balancing';

export interface BidBlock {
  timestamp: Date;
  product: FlexProduct;
  reservedMw: number;
  capacityPriceEurMwH: number;
  energyPriceEurMwh: number;
  isAvailable: boolean;
}

// --- Market reference prices ---

export interface PriceReferenceBlock {
  timestamp: Date;
  daSpotEurMwh: number;
  idForecastEurMwh: number;
  mfrrRefEurMwh: number;
  isForecast: boolean;
}

// --- DA load shift (Flex 1.0 baseline vs managed comparison) ---

export interface LoadShiftBlock {
  timestamp: Date;
  baselineKwh: number; // uncontrolled charging (plug-in-proportional, no price signal)
  actualKwh: number; // Gridio-managed load (price-shifted)
  deltaKwh: number; // actualKwh - baselineKwh (negative = load removed, positive = load added)
  daSpotEurMwh: number; // DA spot price for this block
  savingsEur: number; // (baselineKwh - actualKwh) × max(0, daSpotEurMwh) / 1000
}

// --- EV user economics (bill discount model) ---

export interface UserEconomicsBlock {
  timestamp: Date;
  userCreditEur: number; // 40% of DA savings + mFRR bonus
  gridioRetainedEur: number; // 60% of DA savings
  mfrrBonusEur: number; // €2.50/MWh per activation
}

// --- Departure compliance ---

export interface DepartureComplianceBlock {
  date: Date;
  commuterCompliancePct: number; // 70% of fleet: weekday departure 07:30, target SoC 80%
  flexibleCompliancePct: number; // 30% of fleet: fleet/WFH, departure 08:30, target SoC 70%
  nonComplianceCount: number;
  reasons: ('grid_event' | 'low_soc_at_plugin' | 'short_session')[];
}

// --- Opt-in stats ---

export interface OptInStatsBlock {
  month: Date; // first day of the month (UTC midnight)
  optInRatePct: number; // fleet-wide weighted average (not a simple average of consumer + fleet rates)
  consumerOptInPct: number;
  fleetOptInPct: number;
  newEnrollments: number;
  churned: number;
}

// --- Activation records ---

export interface ActivationBlock {
  timestamp: Date;
  baselineKwh: number;
  actualKwh: number;
  deltaKwh: number;
  priceEurMwh: number;
  capacityPaymentEur: number;
  energyPaymentEur: number;
  imbalanceCostEur: number;
  valueEur: number;
}

export interface ActivationRecord {
  id: string;
  timestamp: Date;
  product: FlexProduct;
  direction: 'up' | 'down' | null;
  requestedKw: number | null;
  deliveredKw: number | null;
  durationMin: number;
  baselineKwh: number;
  actualKwh: number;
  shiftedKwh: number;
  capacityPaymentEur: number;
  energyPaymentEur: number;
  imbalanceCostEur: number;
  revenueEur: number;
  blocks: ActivationBlock[];
}

export type MarketArea =
  | 'global'
  | 'BE'
  | 'NL'
  | 'DE-LU'
  | 'FR'
  | 'GB'
  | 'DK1'
  | 'DK2'
  | 'FI'
  | 'NO2'
  | 'SE3'
  | 'EE'
  | 'LV'
  | 'LT';
