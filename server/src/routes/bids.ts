import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { parseISO } from 'date-fns';
import { requireScope } from '../middleware/auth';
import { generateBidTimeline } from '@/data/generators';
import { getBids, saveBids } from '../store/bidStore';
import { BidBlockSchema, SaveBidsBodySchema } from '../schemas';
import type { BidBlock } from '@/types';

export const bidsRoutes = new OpenAPIHono();

bidsRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/bids',
    tags: ['Bids'],
    summary: 'Get bid timeline for a date',
    description:
      'Returns saved bids for the date, or generated defaults if none have been saved.',
    request: {
      query: z.object({
        date: z.string().date().describe('Date in YYYY-MM-DD format'),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(BidBlockSchema) } },
        description: 'Bid blocks',
      },
    },
  }),
  (c) => {
    const { date } = c.req.valid('query');
    const saved = getBids(date);
    const blocks =
      saved.length > 0 ? saved : generateBidTimeline(parseISO(date));
    return c.json(
      blocks.map((b) => ({
        ...b,
        timestamp: new Date(b.timestamp).toISOString(),
      }))
    );
  }
);

bidsRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/bids',
    middleware: [requireScope('write')] as const,
    tags: ['Bids'],
    summary: 'Save bid timeline',
    description: 'Saves a new bid timeline for the given date.',
    request: {
      body: {
        content: { 'application/json': { schema: SaveBidsBodySchema } },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: z.object({
              id: z.string(),
              date: z.string(),
              savedAt: z.string().datetime(),
            }),
          },
        },
        description: 'Saved bid version metadata',
      },
    },
  }),
  (c) => {
    const body = c.req.valid('json');
    const blocks: BidBlock[] = body.blocks.map((b) => ({
      ...b,
      timestamp: new Date(b.timestamp),
    }));
    const version = saveBids(body.date, blocks);
    return c.json(
      {
        id: version.id,
        date: version.date,
        savedAt: version.savedAt.toISOString(),
      },
      201
    );
  }
);
