import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { generateHistoricLoad, generateForecastLoad } from '@/data/generators';
import { runSimulation } from '@/data/simulation';
import {
  SimulationRequestSchema,
  SimulationResultSchema,
  ErrorSchema,
  ProblemDetailsSchema,
} from '../schemas';
import { getSimulatedNow } from '../services/simulationClock';
import { format } from 'date-fns';

export const simulationRoutes = new OpenAPIHono();

simulationRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/simulation/run',
    tags: ['Simulation'],
    summary: 'Run load-shift simulation',
    description:
      'Given a new price curve for a date, returns the projected vs baseline EV fleet load. Uses price elasticity to model how the fleet responds to the new prices.',
    request: {
      body: {
        content: { 'application/json': { schema: SimulationRequestSchema } },
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: SimulationResultSchema } },
        description:
          'Simulation result with baseline and projected load series',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'No load data available for the requested date',
      },
    },
  }),
  (c) => {
    const { date, newPriceBlocks } = c.req.valid('json');

    const historic = generateHistoricLoad(365).filter(
      (b) => format(b.timestamp, 'yyyy-MM-dd') === date
    );
    const forecast = generateForecastLoad(14).filter(
      (b) => format(b.timestamp, 'yyyy-MM-dd') === date
    );

    const baselineBlocks = historic.length > 0 ? historic : forecast;

    if (baselineBlocks.length === 0) {
      return c.json({ error: `No load data available for date ${date}` }, 400);
    }

    const priceCurve = newPriceBlocks.map((b) => ({
      timestamp: new Date(b.timestamp),
      priceEurMwh: b.priceEurMwh,
    }));

    const result = runSimulation(baselineBlocks, priceCurve);

    return c.json(
      {
        baseline: result.baseline.map((b) => ({
          timestamp: b.timestamp.toISOString(),
          flexibleKwh: b.flexibleKwh,
          nonFlexibleKwh: b.nonFlexibleKwh,
          priceEurMwh: b.priceEurMwh,
        })),
        projected: result.projected.map((b) => ({
          timestamp: b.timestamp.toISOString(),
          flexibleKwh: b.flexibleKwh,
          nonFlexibleKwh: b.nonFlexibleKwh,
          priceEurMwh: b.priceEurMwh,
        })),
      },
      200
    );
  }
);

// GET /simulation/now
simulationRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/simulation/now',
    tags: ['Simulation'],
    summary: 'Get current simulated time',
    description:
      'Returns the current simulated timestamp. Advances every 15 real-world minutes as forecast blocks convert to actuals.',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              simulatedNow: z
                .string()
                .datetime()
                .describe('Current simulated time (ISO 8601 UTC)'),
            }),
          },
        },
        description: 'Current simulated time',
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
  (c) => c.json({ simulatedNow: getSimulatedNow().toISOString() })
);
