import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { parseISO } from 'date-fns';
import { generateSoCCurve } from '@/data/generators';
import { SoCBlockSchema } from '../schemas';

export const socRoutes = new OpenAPIHono();

socRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/fleet/soc',
    tags: ['Fleet'],
    summary: 'Get SoC curve for a date',
    description:
      'Returns 96 × 15-minute SoC blocks with plug-in count and up/down headroom.',
    request: {
      query: z.object({
        date: z.string().date().describe('Date in YYYY-MM-DD format'),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(SoCBlockSchema) } },
        description: 'SoC curve blocks',
      },
    },
  }),
  (c) => {
    const { date } = c.req.valid('query');
    const blocks = generateSoCCurve(parseISO(date));
    return c.json(
      blocks.map((b) => ({
        ...b,
        timestamp: b.timestamp.toISOString(),
      }))
    );
  }
);
