import { z } from '@hono/zod-openapi';

export const FleetStatsSchema = z
  .object({
    totalCapacityKwh: z
      .number()
      .describe('Total battery capacity of the fleet in kWh'),
    availableFlexibilityKw: z
      .number()
      .describe('Currently available flexible power in kW'),
    activeEvCount: z.number().int().describe('Number of EVs currently active'),
    avgStateOfChargePct: z
      .number()
      .min(0)
      .max(100)
      .describe('Average SoC across active EVs (%)'),
    upHeadroomKw: z.number().describe('Up-regulation headroom (kW)'),
    downHeadroomKw: z.number().describe('Down-regulation headroom (kW)'),
  })
  .openapi('FleetStats');

export const SoCBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of 15-min block (ISO 8601)'),
    avgSoCPct: z.number().min(0).max(100).describe('Fleet average SoC (%)'),
    pluggedInCount: z.number().int().describe('EVs currently plugged in'),
    upHeadroomKwh: z
      .number()
      .describe('Energy available for up-regulation (kWh)'),
    downHeadroomKwh: z
      .number()
      .describe('Energy available for down-regulation (kWh)'),
    dynamicFloorPct: z
      .number()
      .min(0)
      .max(100)
      .describe('Departure-ramp SoC floor for this block (%)'),
  })
  .openapi('SoCBlock');

export const TimeBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of the 15-minute block (ISO 8601)'),
    flexibleKwh: z.number().describe('Flexible charging volume in kWh'),
    nonFlexibleKwh: z.number().describe('Non-flexible charging volume in kWh'),
    priceEurMwh: z.number().describe('Day-ahead electricity price in EUR/MWh'),
  })
  .openapi('TimeBlock');

export const LoadResponseSchema = z
  .object({
    window: z.enum(['1D', '1W', '1M', '1Y']),
    simulatedNow: z
      .string()
      .datetime()
      .describe('Current simulated time (ISO 8601)'),
    blocks: z.array(TimeBlockSchema),
  })
  .openapi('LoadResponse');

export const WindowQuerySchema = z.object({
  window: z
    .enum(['1D', '1W', '1M', '1Y'])
    .default('1D')
    .describe('Time window for load data'),
});

export const PriceBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of the 15-minute block (ISO 8601)'),
    priceEurMwh: z.number().describe('Price in EUR/MWh'),
  })
  .openapi('PriceBlock');

export const PriceCurveVersionSchema = z
  .object({
    id: z.string(),
    date: z
      .string()
      .date()
      .describe('The day this curve applies to (YYYY-MM-DD)'),
    createdAt: z.string().datetime(),
    blocks: z.array(PriceBlockSchema),
    summary: z
      .string()
      .describe(
        'Auto-generated change summary e.g. "12 blocks changed on 06 Mar"'
      ),
    isActive: z.boolean(),
  })
  .openapi('PriceCurveVersion');

export const SaveVersionBodySchema = z
  .object({
    date: z.string().date().describe('Date for the price curve (YYYY-MM-DD)'),
    blocks: z
      .array(PriceBlockSchema)
      .describe('The full 96-block price curve for the day'),
  })
  .openapi('SaveVersionBody');

export const SimulationRequestSchema = z
  .object({
    date: z.string().date().describe('Date to simulate (YYYY-MM-DD)'),
    newPriceBlocks: z
      .array(PriceBlockSchema)
      .describe('New price curve to simulate against'),
  })
  .openapi('SimulationRequest');

export const SimulationResultSchema = z
  .object({
    baseline: z.array(TimeBlockSchema),
    projected: z.array(TimeBlockSchema),
  })
  .openapi('SimulationResult');

export const PriceReferenceBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of 15-min block (ISO 8601)'),
    daSpotEurMwh: z
      .number()
      .describe(
        'DA spot price (real when available, forecast otherwise) in EUR/MWh'
      ),
    idForecastEurMwh: z
      .number()
      .describe('Intraday forecast price (DA ± spread) in EUR/MWh'),
    mfrrRefEurMwh: z
      .number()
      .describe('mFRR reference price (DA + capacity premium) in EUR/MWh'),
    isForecast: z.boolean().describe('True when this block is in the future'),
  })
  .openapi('PriceReferenceBlock');

export const AreaQuerySchema = z.object({
  area: z
    .enum([
      'global',
      'BE',
      'NL',
      'DE-LU',
      'FR',
      'GB',
      'DK1',
      'DK2',
      'FI',
      'NO2',
      'SE3',
      'EE',
      'LV',
      'LT',
    ])
    .default('BE')
    .describe('ENTSO-E bidding zone or "global" for fleet-weighted average'),
});

export const ProblemDetailsSchema = z
  .object({
    type: z.string().describe('URI reference identifying the problem type'),
    title: z.string().describe('Short human-readable summary'),
    status: z.number().int().describe('HTTP status code'),
    detail: z.string().describe('Explanation specific to this occurrence'),
    instance: z
      .string()
      .optional()
      .describe('URI identifying this specific occurrence'),
    errors: z
      .record(z.array(z.string()))
      .optional()
      .describe('Field-level validation errors'),
  })
  .openapi('ProblemDetails');

// Keep alias so existing route files that import ErrorSchema still compile
export const ErrorSchema = ProblemDetailsSchema;

const PROBLEM_TYPES: Record<number, string> = {
  400: 'https://gridio.io/errors/bad-request',
  401: 'https://gridio.io/errors/unauthorized',
  403: 'https://gridio.io/errors/forbidden',
  404: 'https://gridio.io/errors/not-found',
  409: 'https://gridio.io/errors/conflict',
  422: 'https://gridio.io/errors/unprocessable',
  429: 'https://gridio.io/errors/rate-limited',
  500: 'https://gridio.io/errors/internal',
};

export function createProblem(
  status: number,
  title: string,
  detail: string,
  extras?: { errors?: Record<string, string[]>; instance?: string }
) {
  return {
    type: PROBLEM_TYPES[status] ?? 'https://gridio.io/errors/error',
    title,
    status,
    detail,
    ...extras,
  };
}

export const FlexProductSchema = z
  .enum(['fcr', 'afrr', 'mfrr', 'id-balancing'])
  .openapi('FlexProduct');

export const BidBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of 15-min block (ISO 8601)'),
    product: FlexProductSchema,
    reservedMw: z.number().min(0).describe('Reserved capacity in MW'),
    capacityPriceEurMwH: z
      .number()
      .min(0)
      .describe('Bid price for availability in EUR/MW/h'),
    energyPriceEurMwh: z
      .number()
      .min(0)
      .describe('Bid price for activation energy in EUR/MWh'),
    isAvailable: z.boolean().describe('Whether this slot is marked available'),
  })
  .openapi('BidBlock');

export const SaveBidsBodySchema = z
  .object({
    date: z.string().date().describe('Date for the bid timeline (YYYY-MM-DD)'),
    blocks: z.array(BidBlockSchema).describe('Full bid timeline blocks'),
  })
  .openapi('SaveBidsBody');

export const MarketStatsSchema = z
  .object({
    daLoadKwh: z
      .number()
      .describe('Energy in DA-scheduled blocks for the period (kWh)'),
    daSavingsEur: z
      .number()
      .describe('Cost saved vs unoptimised baseline — DA market (€)'),
    idAdjustmentsKwh: z
      .number()
      .describe('Volume shifted via intraday price overrides (kWh)'),
    idSavingsEur: z
      .number()
      .describe('Additional savings from intraday adjustments (€)'),
    from: z.string().datetime().describe('Period start (ISO 8601)'),
    to: z.string().datetime().describe('Period end (ISO 8601)'),
  })
  .openapi('MarketStats');

export const ActivationBlockSchema = z
  .object({
    timestamp: z.string().datetime(),
    baselineKwh: z.number(),
    actualKwh: z.number(),
    deltaKwh: z.number(),
    priceEurMwh: z.number(),
    valueEur: z.number(),
  })
  .openapi('ActivationBlock');

export const ActivationRecordSchema = z
  .object({
    id: z.string(),
    timestamp: z.string().datetime(),
    type: z.enum(['price-curve', 'mfrr']),
    direction: z.enum(['up', 'down']).nullable(),
    requestedKw: z.number().nullable(),
    deliveredKw: z.number().nullable(),
    durationMin: z.number().int(),
    baselineKwh: z.number(),
    actualKwh: z.number(),
    shiftedKwh: z.number(),
    revenueEur: z.number(),
  })
  .openapi('ActivationRecord');

export const SettlementSummarySchema = z
  .object({
    totalLoadShiftedKwh: z.number(),
    daSavingsEur: z.number(),
    idSavingsEur: z.number(),
    mfrrRevenueEur: z.number(),
    totalEarnedEur: z.number(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .openapi('SettlementSummary');

export const PaginatedActivationsSchema = z
  .object({
    data: z.array(ActivationRecordSchema),
    meta: z.object({
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      hasMore: z.boolean(),
    }),
  })
  .openapi('PaginatedActivations');

export const MfrrActivationResponseSchema = z
  .object({
    activationId: z.string(),
    status: z.enum(['accepted', 'rejected']),
    direction: z.enum(['up', 'down']),
    requestedKw: z.number(),
    confirmedKw: z.number().nullable(),
    reliabilityAdjustedKw: z.number().nullable(),
    reason: z
      .string()
      .optional()
      .describe('Rejection reason if status is rejected'),
    tDispatch: z.string().datetime().nullable(),
  })
  .openapi('MfrrActivationResponse');

export const ImbalancePriceBlockSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .describe('Start of 15-min block (ISO 8601)'),
    imbalancePriceEurMwh: z
      .number()
      .describe('Belgian imbalance settlement price (EUR/MWh)'),
  })
  .openapi('ImbalancePriceBlock');
