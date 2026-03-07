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
