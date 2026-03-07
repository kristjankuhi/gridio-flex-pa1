import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { requireScope } from '../middleware/auth';
import {
  filterActivations,
  getActivationById,
  listActivations,
} from '../store/settlementStore';
import {
  ProblemDetailsSchema,
  SettlementSummarySchema,
  PaginatedActivationsSchema,
  ActivationRecordSchema,
} from '../schemas';

export const settlementRoutes = new OpenAPIHono();

// GET /settlement/summary?from=&to=
settlementRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/settlement/summary',
    tags: ['Settlement'],
    summary: 'Get settlement summary',
    description:
      'Returns aggregated totals for load shifted, DA/ID savings, mFRR revenue and total earned for the requested period.',
    middleware: [requireScope('read')] as const,
    request: {
      query: z.object({
        from: z.string().datetime().describe('Period start (ISO 8601)'),
        to: z.string().datetime().describe('Period end (ISO 8601)'),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: SettlementSummarySchema } },
        description: 'Settlement summary for the period',
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
    const { from, to } = c.req.valid('query');
    const records = filterActivations({
      from: new Date(from),
      to: new Date(to),
    });

    let totalLoadShiftedKwh = 0;
    let daSavingsEur = 0;
    let idSavingsEur = 0;
    let mfrrRevenueEur = 0;

    for (const r of records) {
      totalLoadShiftedKwh += r.shiftedKwh;
      if (r.type === 'price-curve') {
        daSavingsEur += r.revenueEur * 0.6;
        idSavingsEur += r.revenueEur * 0.4;
      } else {
        mfrrRevenueEur += r.revenueEur;
      }
    }

    const totalEarnedEur = daSavingsEur + idSavingsEur + mfrrRevenueEur;

    return c.json({
      totalLoadShiftedKwh: Math.round(totalLoadShiftedKwh * 10) / 10,
      daSavingsEur: Math.round(daSavingsEur * 100) / 100,
      idSavingsEur: Math.round(idSavingsEur * 100) / 100,
      mfrrRevenueEur: Math.round(mfrrRevenueEur * 100) / 100,
      totalEarnedEur: Math.round(totalEarnedEur * 100) / 100,
      from,
      to,
    });
  }
);

// GET /settlement/activations?from=&to=&type=&page=&limit=
settlementRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/settlement/activations',
    tags: ['Settlement'],
    summary: 'List activation records',
    description:
      'Returns a paginated list of activation records (price-curve and mFRR), newest first.',
    middleware: [requireScope('read')] as const,
    request: {
      query: z.object({
        from: z
          .string()
          .datetime()
          .optional()
          .describe('Period start (ISO 8601)'),
        to: z.string().datetime().optional().describe('Period end (ISO 8601)'),
        type: z
          .enum(['price-curve', 'mfrr'])
          .optional()
          .describe('Filter by activation type'),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PaginatedActivationsSchema } },
        description: 'Paginated activation records',
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
    const { from, to, type, page, limit } = c.req.valid('query');
    const all = filterActivations({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      type,
    });

    const total = all.length;
    const slice = all.slice((page - 1) * limit, page * limit);

    return c.json({
      data: slice.map((r) => ({
        id: r.id,
        timestamp: r.timestamp.toISOString(),
        type: r.type,
        direction: r.direction,
        requestedKw: r.requestedKw,
        deliveredKw: r.deliveredKw,
        durationMin: r.durationMin,
        baselineKwh: r.baselineKwh,
        actualKwh: r.actualKwh,
        shiftedKwh: r.shiftedKwh,
        revenueEur: r.revenueEur,
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    });
  }
);

// GET /settlement/activations/:id
settlementRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/settlement/activations/{id}',
    tags: ['Settlement'],
    summary: 'Get activation by ID',
    description: 'Returns a single activation record by its ID.',
    middleware: [requireScope('read')] as const,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: ActivationRecordSchema } },
        description: 'Activation record',
      },
      404: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Activation not found',
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
    const { id } = c.req.valid('param');
    const record = getActivationById(id);
    if (!record) {
      return c.json(
        {
          type: 'https://gridio.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Activation ${id} not found`,
        },
        404
      );
    }
    return c.json({
      id: record.id,
      timestamp: record.timestamp.toISOString(),
      type: record.type,
      direction: record.direction,
      requestedKw: record.requestedKw,
      deliveredKw: record.deliveredKw,
      durationMin: record.durationMin,
      baselineKwh: record.baselineKwh,
      actualKwh: record.actualKwh,
      shiftedKwh: record.shiftedKwh,
      revenueEur: record.revenueEur,
    });
  }
);

// GET /settlement/activations/export  (CSV)
settlementRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/settlement/activations/export',
    tags: ['Settlement'],
    summary: 'Export activations as CSV',
    description:
      'Downloads all activation records as a CSV file for offline analysis.',
    middleware: [requireScope('read')] as const,
    request: {
      query: z.object({
        from: z
          .string()
          .datetime()
          .optional()
          .describe('Period start (ISO 8601)'),
        to: z.string().datetime().optional().describe('Period end (ISO 8601)'),
        type: z.enum(['price-curve', 'mfrr']).optional(),
      }),
    },
    responses: {
      200: {
        content: { 'text/csv': { schema: z.string() } },
        description: 'CSV file with all matching activation records',
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
    const { from, to, type } = c.req.valid('query');
    const records = filterActivations({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      type,
    });

    const header =
      'id,timestamp,type,direction,requestedKw,deliveredKw,durationMin,baselineKwh,actualKwh,shiftedKwh,revenueEur';
    const rows = records.map((r) =>
      [
        r.id,
        r.timestamp.toISOString(),
        r.type,
        r.direction ?? '',
        r.requestedKw ?? '',
        r.deliveredKw ?? '',
        r.durationMin,
        r.baselineKwh,
        r.actualKwh,
        r.shiftedKwh,
        r.revenueEur,
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="activations.csv"',
      },
    });
  }
);

// GET /settlement/activations (fallback for listActivations without filters — already covered above)
// Kept separate: full unfiltered list used internally
export function getAllActivations() {
  return listActivations();
}
