import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { parseISO } from 'date-fns';
import { generatePriceReference } from '@/data/generators';
import { getPriceCacheFor15MinBlock } from '../services/priceService';
import { PriceReferenceBlockSchema } from '../schemas';

export const marketPricesRoutes = new OpenAPIHono();

marketPricesRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/market/reference-prices',
    tags: ['Market'],
    summary: 'Get market reference prices for a date',
    description:
      'Returns DA spot (real when available, forecast otherwise), ID forecast (DA ± spread), ' +
      'and mFRR reference (DA + capacity premium) for 96 × 15-min blocks.',
    request: {
      query: z.object({
        date: z.string().date().describe('Date in YYYY-MM-DD format'),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': { schema: z.array(PriceReferenceBlockSchema) },
        },
        description: 'Reference price blocks',
      },
    },
  }),
  (c) => {
    const { date } = c.req.valid('query');
    const blocks = generatePriceReference(parseISO(date));

    // Layer real DA prices from cache where available
    const withRealDA = blocks.map((b) => {
      const realDA = getPriceCacheFor15MinBlock(b.timestamp);
      if (realDA === null) {
        return { ...b, timestamp: b.timestamp.toISOString() };
      }
      const mfrrPremium = b.mfrrRefEurMwh - b.daSpotEurMwh;
      return {
        ...b,
        daSpotEurMwh: realDA,
        mfrrRefEurMwh: realDA + mfrrPremium,
        isForecast: false,
        timestamp: b.timestamp.toISOString(),
      };
    });

    return c.json(withRealDA);
  }
);
