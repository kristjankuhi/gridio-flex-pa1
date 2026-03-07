import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { generateBasePriceCurve } from '@/data/generators';
import { applyRealPrices } from '../services/priceService';
import { requireScope } from '../middleware/auth';
import {
  PriceBlockSchema,
  PriceCurveVersionSchema,
  SaveVersionBodySchema,
  ErrorSchema,
} from '../schemas';
import {
  getVersions,
  getActiveVersion,
  saveVersion,
  restoreVersion,
} from '../store/priceCurveStore';

export const priceCurveRoutes = new OpenAPIHono();

// GET /price-curve — active curve for a date
priceCurveRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/price-curve',
    tags: ['Price Curve'],
    summary: 'Get active price curve for a date',
    description:
      'Returns the 96 × 15-minute price blocks for the requested date. Uses the active saved version for that date if one exists, otherwise returns real Belgian DA prices (or synthetic fallback).',
    request: {
      query: z.object({
        date: z.string().date().describe('Date in YYYY-MM-DD format'),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(PriceBlockSchema) } },
        description: 'Price curve blocks',
      },
    },
  }),
  (c) => {
    const { date } = c.req.valid('query');
    const active = getActiveVersion(date);
    const blocks =
      active?.blocks ?? applyRealPrices(generateBasePriceCurve(new Date(date)));
    return c.json(
      blocks.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        priceEurMwh: b.priceEurMwh,
      }))
    );
  }
);

// GET /price-curve/versions
priceCurveRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/price-curve/versions',
    tags: ['Price Curve'],
    summary: 'List price curve versions',
    description:
      'Returns saved versions. Pass ?date=YYYY-MM-DD to filter by date.',
    request: {
      query: z.object({
        date: z
          .string()
          .date()
          .optional()
          .describe('Filter by date (YYYY-MM-DD)'),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(PriceCurveVersionSchema) },
        },
        description:
          'Versions, newest first. Active version has isActive: true.',
      },
    },
  }),
  (c) => {
    const { date } = c.req.valid('query');
    const versionList = getVersions(date).map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      blocks: v.blocks.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        priceEurMwh: b.priceEurMwh,
      })),
    }));
    return c.json(versionList);
  }
);

// POST /price-curve/versions
priceCurveRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/price-curve/versions',
    middleware: [requireScope('write')] as const,
    tags: ['Price Curve'],
    summary: 'Save a new price curve version',
    description:
      'Saves the provided price curve as the new active version for that date. Previous active version for the same date is retained in history.',
    request: {
      body: {
        content: { 'application/json': { schema: SaveVersionBodySchema } },
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: PriceCurveVersionSchema } },
        description: 'Newly created version',
      },
    },
  }),
  (c) => {
    const body = c.req.valid('json');
    const blocks = body.blocks.map((b) => ({
      timestamp: new Date(b.timestamp),
      priceEurMwh: b.priceEurMwh,
    }));
    const version = saveVersion(body.date, blocks);
    return c.json(
      {
        ...version,
        createdAt: version.createdAt.toISOString(),
        blocks: version.blocks.map((b) => ({
          timestamp: new Date(b.timestamp).toISOString(),
          priceEurMwh: b.priceEurMwh,
        })),
      },
      201
    );
  }
);

// POST /price-curve/versions/:id/restore
priceCurveRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/price-curve/versions/{id}/restore',
    middleware: [requireScope('write')] as const,
    tags: ['Price Curve'],
    summary: 'Restore a previous version',
    description:
      'Sets the specified version as the active price curve for its date.',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PriceCurveVersionSchema } },
        description: 'The restored (now active) version',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Version not found',
      },
    },
  }),
  (c) => {
    const { id } = c.req.valid('param');
    const version = restoreVersion(id);
    if (!version) return c.json({ error: `Version ${id} not found` }, 404);
    return c.json(
      {
        ...version,
        createdAt: version.createdAt.toISOString(),
        blocks: version.blocks.map((b) => ({
          timestamp: new Date(b.timestamp).toISOString(),
          priceEurMwh: b.priceEurMwh,
        })),
      },
      200
    );
  }
);
