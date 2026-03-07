import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  generateFleetStats,
  generateHistoricLoad,
  generateForecastLoad,
} from '@/data/generators';
import { getSimulatedNow } from '../services/simulationClock';
import { applyRealPrices } from '../services/priceService';
import { FleetStatsSchema, LoadResponseSchema } from '../schemas';

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
    request: {
      query: z.object({
        window: z
          .enum(['1D', '1W', '1M', '1Y'])
          .default('1D')
          .describe('Time window for load data'),
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
          .default('BE'),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: LoadResponseSchema } },
        description: 'Load time series with price curve',
      },
    },
  }),
  (c) => {
    const { window, area } = c.req.valid('query');
    const bzn = area === 'global' ? 'BE' : area;
    const daysBack =
      window === '1D' ? 1 : window === '1W' ? 7 : window === '1M' ? 30 : 365;
    const daysAhead =
      window === '1D' ? 1 : window === '1W' ? 2 : window === '1M' ? 5 : 30;

    const simulatedNow = getSimulatedNow();
    const historic = generateHistoricLoad(daysBack);
    const forecast = generateForecastLoad(daysAhead);
    const allBlocks = applyRealPrices([...historic, ...forecast], bzn);

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
