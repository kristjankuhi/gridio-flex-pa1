import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { parseISO } from 'date-fns';
import { generatePriceReference } from '@/data/generators';
import { getPriceCacheFor15MinBlock } from '../services/priceService';
import { getMfrrMarginalPrice } from '../services/eliaService';
import { PriceReferenceBlockSchema, ProblemDetailsSchema } from '../schemas';

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
        content: {
          'application/json': { schema: z.array(PriceReferenceBlockSchema) },
        },
        description: 'Reference price blocks',
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
    const { date, area } = c.req.valid('query');
    const bzn = area === 'global' ? 'BE' : area;
    const blocks = generatePriceReference(parseISO(date));

    const withRealDA = blocks.map((b) => {
      const realDA = getPriceCacheFor15MinBlock(b.timestamp, bzn);
      if (realDA === null)
        return { ...b, timestamp: b.timestamp.toISOString() };
      const syntheticPremium = b.mfrrRefEurMwh - b.daSpotEurMwh;
      const realMfrr = getMfrrMarginalPrice(b.timestamp);
      return {
        ...b,
        daSpotEurMwh: realDA,
        mfrrRefEurMwh: realMfrr ?? realDA + syntheticPremium,
        isForecast: false,
        timestamp: b.timestamp.toISOString(),
      };
    });

    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(withRealDA);
  }
);
