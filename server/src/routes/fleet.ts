import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
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
} from '../schemas';

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
  (c) => c.json(generateFleetStats())
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
