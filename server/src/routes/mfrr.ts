import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { requireScope } from '../middleware/auth';
import { generateFleetStats } from '@/data/generators';
import { addActivation } from '../store/settlementStore';
import { MfrrActivationResponseSchema, ProblemDetailsSchema } from '../schemas';

export const mfrrRoutes = new OpenAPIHono();

const MfrrActivateBodySchema = z
  .object({
    direction: z.enum(['up', 'down']).describe('Regulation direction'),
    kw: z.number().positive().describe('Requested capacity in kW'),
    durationMin: z
      .number()
      .int()
      .min(1)
      .max(240)
      .describe('Requested duration in minutes'),
  })
  .openapi('MfrrActivateBody');

const MfrrDeactivateBodySchema = z
  .object({
    activationId: z.string().describe('ID of the activation to deactivate'),
  })
  .openapi('MfrrDeactivateBody');

const MfrrDeactivateResponseSchema = z
  .object({
    status: z.literal('deactivated'),
    activationId: z.string(),
    restoredAt: z.string().datetime(),
  })
  .openapi('MfrrDeactivateResponse');

// Active activations map (in-memory)
const activeMap = new Map<string, { activationId: string; startedAt: Date }>();

// POST /mfrr/activate
mfrrRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/mfrr/activate',
    tags: ['mFRR'],
    summary: 'Activate mFRR flexibility',
    description:
      'Requests an mFRR activation from the EV fleet. Validates requested capacity against current headroom. Admin scope required.',
    middleware: [requireScope('admin')] as const,
    request: {
      body: {
        content: { 'application/json': { schema: MfrrActivateBodySchema } },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: MfrrActivationResponseSchema },
        },
        description: 'Activation accepted or rejected',
      },
      422: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Requested kW exceeds available headroom',
      },
      401: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Missing or invalid API key',
      },
      403: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Admin scope required',
      },
    },
  }),
  (c) => {
    const { direction, kw, durationMin } = c.req.valid('json');
    const stats = generateFleetStats();

    const availableKw =
      direction === 'up' ? stats.upHeadroomKw : stats.downHeadroomKw;

    if (kw > availableKw * 1.1) {
      // Allow up to 10% over-request — reject beyond that
      return c.json(
        {
          type: 'https://gridio.dev/errors/unprocessable',
          title: 'Unprocessable Entity',
          status: 422,
          detail: `Requested ${kw} kW exceeds available ${direction} headroom of ${availableKw} kW`,
        },
        422
      );
    }

    const activationId = `mfrr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Reliability factor: 90–98%
    const reliabilityFactor = 0.9 + Math.random() * 0.08;
    const confirmedKw = kw <= availableKw ? Math.round(kw) : null;
    const reliabilityAdjustedKw =
      confirmedKw !== null ? Math.round(confirmedKw * reliabilityFactor) : null;

    const status = kw <= availableKw ? 'accepted' : 'rejected';
    const tDispatch =
      status === 'accepted'
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : null;

    if (status === 'accepted' && reliabilityAdjustedKw !== null) {
      activeMap.set(activationId, { activationId, startedAt: new Date() });

      // Record in settlement store
      const durationHours = durationMin / 60;
      const baselineKwh = Math.round(
        stats.availableFlexibilityKw * durationHours * 0.4
      );
      const shiftedKwh = Math.round(reliabilityAdjustedKw * durationHours);
      const actualKwh =
        direction === 'up'
          ? Math.max(0, baselineKwh - shiftedKwh)
          : baselineKwh + shiftedKwh;

      addActivation({
        id: activationId,
        timestamp: new Date(),
        type: 'mfrr',
        direction,
        requestedKw: kw,
        deliveredKw: reliabilityAdjustedKw,
        durationMin,
        baselineKwh,
        actualKwh,
        shiftedKwh,
        revenueEur:
          Math.round(reliabilityAdjustedKw * durationHours * 0.19 * 10) / 10,
      });
    }

    return c.json({
      activationId,
      status,
      direction,
      requestedKw: kw,
      confirmedKw,
      reliabilityAdjustedKw,
      reason:
        status === 'rejected'
          ? `Requested ${kw} kW exceeds available headroom of ${availableKw} kW`
          : undefined,
      tDispatch,
    });
  }
);

// POST /mfrr/deactivate
mfrrRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/mfrr/deactivate',
    tags: ['mFRR'],
    summary: 'Deactivate mFRR activation',
    description:
      'Signals the end of an mFRR activation, restoring normal fleet charging. Admin scope required.',
    middleware: [requireScope('admin')] as const,
    request: {
      body: {
        content: { 'application/json': { schema: MfrrDeactivateBodySchema } },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: MfrrDeactivateResponseSchema },
        },
        description: 'Activation deactivated',
      },
      404: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Activation ID not found or already deactivated',
      },
      401: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Missing or invalid API key',
      },
      403: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Admin scope required',
      },
    },
  }),
  (c) => {
    const { activationId } = c.req.valid('json');

    if (!activeMap.has(activationId)) {
      return c.json(
        {
          type: 'https://gridio.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Activation ${activationId} not found or already deactivated`,
        },
        404
      );
    }

    activeMap.delete(activationId);

    return c.json({
      status: 'deactivated' as const,
      activationId,
      restoredAt: new Date().toISOString(),
    });
  }
);
