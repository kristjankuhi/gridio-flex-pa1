export interface TimeBlock {
  timestamp: Date; // start of 15-min block
  flexibleKwh: number;
  nonFlexibleKwh: number;
  priceEurMwh: number;
}

export interface FleetStats {
  totalCapacityKwh: number;
  availableFlexibilityKw: number;
  activeEvCount: number;
  avgStateOfChargePct: number;
}

export interface PriceBlock {
  timestamp: Date;
  priceEurMwh: number;
}

export interface PriceCurveVersion {
  id: string;
  createdAt: Date;
  blocks: PriceBlock[]; // only the edited blocks (sparse — not all 96)
  summary: string; // auto-generated e.g. "12 blocks changed on 06 Mar"
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
