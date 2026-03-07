import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
} from '@/data/generators';
import { getSimulatedNow } from '../services/simulationClock';
import { applyRealPrices } from '../services/priceService';
import {
  FleetStatsSchema,
  LoadResponseSchema,
  WindowQuerySchema,
  MarketStatsSchema,
  ProblemDetailsSchema,
  AreaQuerySchema,
} from '../schemas';

const AREA_EV_COUNTS: Record<string, number> = {
  global: 8382,
  BE: 8382,
  NL: 12500,
  'DE-LU': 45000,
  FR: 22000,
  GB: 38000,
  DK1: 3200,
  DK2: 2800,
  FI: 4100,
  NO2: 6200,
  SE3: 8900,
  EE: 1200,
  LV: 900,
  LT: 1400,
};

export const fleetRoutes = new OpenAPIHono();

fleetRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/fleet/stats',
    tags: ['Fleet'],
    summary: 'Get current fleet statistics',
    description:
      'Returns aggregate capacity, flexibility availability, active EV count and average state of charge.',
    responses: {
      200: {
        content: { 'application/json': { schema: FleetStatsSchema } },
        description: 'Fleet statistics',
      },
    },
  }),
  (c) => {
    c.header('Cache-Control', 'public, max-age=30');
    return c.json(generateFleetStats());
  }
);

fleetRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/fleet/load',
    tags: ['Fleet'],
    summary: 'Get fleet load time series',
    description:
      'Returns historic and forecast charging load (flexible + non-flexible) with day-ahead prices.',
    request: { query: WindowQuerySchema },
    responses: {
      200: {
        content: { 'application/json': { schema: LoadResponseSchema } },
        description: 'Load time series with price curve',
      },
    },
  }),
  (c) => {
    const { window } = c.req.valid('query');
    const daysBack =
      window === '1D' ? 1 : window === '1W' ? 7 : window === '1M' ? 30 : 365;
    const daysAhead =
      window === '1D' ? 1 : window === '1W' ? 2 : window === '1M' ? 5 : 30;

    const simulatedNow = getSimulatedNow();
    const historic = generateHistoricLoad(daysBack);
    const forecast = generateForecastLoad(daysAhead);
    const allBlocks = applyRealPrices([...historic, ...forecast]);

    c.header('Cache-Control', 'public, max-age=30');
    return c.json({
      window,
      simulatedNow: simulatedNow.toISOString(),
      blocks: allBlocks.map((b) => ({
        timestamp: b.timestamp.toISOString(),
        flexibleKwh: b.flexibleKwh,
        nonFlexibleKwh: b.nonFlexibleKwh,
        priceEurMwh: b.priceEurMwh,
      })),
    });
  }
);

fleetRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/fleet/market-stats',
    tags: ['Fleet'],
    summary: 'Get DA vs ID market performance',
    description:
      'Returns day-ahead and intraday performance metrics for the requested period. Values are simulated based on fleet size for the selected area.',
    request: {
      query: z.object({
        from: z.string().datetime().describe('Period start (ISO 8601)'),
        to: z.string().datetime().describe('Period end (ISO 8601)'),
        area: AreaQuerySchema.shape.area,
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: MarketStatsSchema } },
        description: 'DA and ID market statistics for the period',
      },
      401: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Missing or invalid API key',
      },
      403: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Insufficient scope',
      },
    },
  }),
  (c) => {
    const { from, to, area } = c.req.valid('query');
    const hours =
      (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
    const evCount = AREA_EV_COUNTS[area] ?? 8382;
    const factor = evCount / 8382;
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({
      daLoadKwh: Math.round(hours * 420 * factor),
      daSavingsEur: Math.round(hours * 18 * factor),
      idAdjustmentsKwh: Math.round(hours * 95 * factor),
      idSavingsEur: Math.round(hours * 7.2 * factor),
      from,
      to,
    });
  }
);
