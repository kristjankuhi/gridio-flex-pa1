import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { generateBasePriceCurve } from '@/data/generators';
import { applyRealPrices } from '../services/priceService';
import { requireScope } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import {
  PriceBlockSchema,
  PriceCurveVersionSchema,
  SaveVersionBodySchema,
  ProblemDetailsSchema,
  createProblem,
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
    const { date } = c.req.valid('query');
    const active = getActiveVersion(date);
    const blocks =
      active?.blocks ?? applyRealPrices(generateBasePriceCurve(new Date(date)));
    c.header('Cache-Control', 'public, max-age=60');
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
        page: z.coerce
          .number()
          .int()
          .min(1)
          .default(1)
          .describe('Page number (1-based)'),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Items per page (max 100)'),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              data: z.array(PriceCurveVersionSchema),
              meta: z.object({
                total: z.number().int(),
                page: z.number().int(),
                limit: z.number().int(),
                hasMore: z.boolean(),
              }),
            }),
          },
        },
        description:
          'Paginated version list, newest first. Active version has isActive: true.',
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
    const { date, page, limit } = c.req.valid('query');
    const all = getVersions(date);
    const total = all.length;
    const slice = all.slice((page - 1) * limit, page * limit);
    const data = slice.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      blocks: v.blocks.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        priceEurMwh: b.priceEurMwh,
      })),
    }));
    c.header('Cache-Control', 'public, max-age=10');
    return c.json({
      data,
      meta: { total, page, limit, hasMore: page * limit < total },
    });
  }
);

// POST /price-curve/versions
priceCurveRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/price-curve/versions',
    middleware: [requireScope('write'), idempotencyMiddleware] as const,
    tags: ['Price Curve'],
    summary: 'Save a new price curve version',
    description:
      'Saves the provided price curve as the new active version for that date. Previous active version for the same date is retained in history. Provide an `Idempotency-Key: <uuid>` header to safely retry on network failures. Duplicate requests with the same key return the original response within 24 hours with an `Idempotent-Replayed: true` header.',
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
      400: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Invalid request body',
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
    middleware: [requireScope('write'), idempotencyMiddleware] as const,
    tags: ['Price Curve'],
    summary: 'Restore a previous version',
    description:
      'Sets the specified version as the active price curve for its date. Provide an `Idempotency-Key: <uuid>` header to safely retry on network failures. Duplicate requests with the same key return the original response within 24 hours with an `Idempotent-Replayed: true` header.',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PriceCurveVersionSchema } },
        description: 'The restored (now active) version',
      },
      401: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Missing or invalid API key',
      },
      403: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Insufficient scope',
      },
      404: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Version not found',
      },
    },
  }),
  (c) => {
    const { id } = c.req.valid('param');
    const version = restoreVersion(id);
    if (!version)
      return c.json(
        createProblem(404, 'Not Found', `Version ${id} not found`),
        404
      );
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
