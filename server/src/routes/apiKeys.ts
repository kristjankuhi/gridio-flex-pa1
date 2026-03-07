import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { requireScope } from '../middleware/auth';
import { listKeys, createKey, revokeKey } from '../store/apiKeyStore';
import { ProblemDetailsSchema, createProblem } from '../schemas';

export const apiKeysRoutes = new OpenAPIHono();

const ApiKeyResponseSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    keyMasked: z
      .string()
      .describe(
        'Key value masked to last 4 chars — full value shown only on creation'
      ),
    scopes: z.array(z.enum(['read', 'write', 'admin'])),
    createdAt: z.string().datetime(),
    lastUsedAt: z.string().datetime().nullable(),
  })
  .openapi('ApiKeyResponse');

const CreateKeyBodySchema = z
  .object({
    label: z
      .string()
      .min(1)
      .max(80)
      .describe('Human-readable name for this key'),
    scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1),
  })
  .openapi('CreateKeyBody');

// GET /api-keys
apiKeysRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api-keys',
    tags: ['API Keys'],
    summary: 'List API keys',
    description: 'Returns all keys with masked values. Requires admin scope.',
    middleware: [requireScope('admin')] as const,
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(ApiKeyResponseSchema) },
        },
        description: 'List of API keys, sorted by creation date',
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
    const keys = listKeys().map((k) => ({
      id: k.id,
      label: k.label,
      keyMasked: `****${k.key.slice(-4)}`,
      scopes: k.scopes,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    }));
    return c.json(keys);
  }
);

// POST /api-keys
apiKeysRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api-keys',
    tags: ['API Keys'],
    summary: 'Create API key',
    description:
      'Creates a new API key. The full key value is returned once and never again — store it securely. Requires admin scope.',
    middleware: [requireScope('admin')] as const,
    request: {
      body: {
        content: { 'application/json': { schema: CreateKeyBodySchema } },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: ApiKeyResponseSchema.extend({
              keyFull: z
                .string()
                .describe('Full key value — shown once only, store securely'),
            }),
          },
        },
        description: 'Created key with full value',
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
        description: 'Admin scope required',
      },
    },
  }),
  (c) => {
    const { label, scopes } = c.req.valid('json');
    const key = createKey(label, scopes);
    return c.json(
      {
        id: key.id,
        label: key.label,
        keyFull: key.key,
        keyMasked: `****${key.key.slice(-4)}`,
        scopes: key.scopes,
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: null,
      },
      201
    );
  }
);

// DELETE /api-keys/:id
apiKeysRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Revoke API key',
    description:
      'Permanently revokes a key. Any subsequent request using the revoked key receives 401 immediately. Requires admin scope.',
    middleware: [requireScope('admin')] as const,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      204: { description: 'Key revoked successfully' },
      404: {
        content: { 'application/json': { schema: ProblemDetailsSchema } },
        description: 'Key not found',
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
    const { id } = c.req.valid('param');
    const ok = revokeKey(id);
    if (!ok)
      return c.json(
        createProblem(404, 'Not Found', `API key ${id} not found`),
        404
      );
    return new Response(null, { status: 204 });
  }
);
