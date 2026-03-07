import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { bidsRoutes } from './routes/bids';
import { fleetRoutes } from './routes/fleet';
import { marketPricesRoutes } from './routes/marketPrices';
import { priceCurveRoutes } from './routes/priceCurve';
import { simulationRoutes } from './routes/simulation';
import { socRoutes } from './routes/soc';
import { apiKeysRoutes } from './routes/apiKeys';
import { settlementRoutes } from './routes/settlement';
import { mfrrRoutes } from './routes/mfrr';
import { initPriceCache, scheduleDailyRefresh } from './services/priceService';
import { startSimulationClock } from './services/simulationClock';
import { authMiddleware } from './middleware/auth';
import { requestIdMiddleware } from './middleware/requestId';
import { createProblem } from './schemas';

const app = new OpenAPIHono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  '*',
  cors({
    origin: (origin) =>
      allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    allowHeaders: [
      'X-API-Key',
      'X-Request-ID',
      'Content-Type',
      'Idempotency-Key',
    ],
    exposeHeaders: ['X-Request-ID', 'X-API-Version', 'X-RateLimit-Remaining'],
  })
);
app.use('*', requestIdMiddleware);
app.use('/api/v1/*', authMiddleware);

app.route('/api/v1', bidsRoutes);
app.route('/api/v1', fleetRoutes);
app.route('/api/v1', marketPricesRoutes);
app.route('/api/v1', priceCurveRoutes);
app.route('/api/v1', simulationRoutes);
app.route('/api/v1', socRoutes);
app.route('/api/v1', apiKeysRoutes);
app.route('/api/v1', settlementRoutes);
app.route('/api/v1', mfrrRoutes);

app.doc('/api/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Gridio Flex API',
    version: 'v1',
    description: `## Authentication\n\nAll \`/api/v1/*\` endpoints require an \`X-API-Key\` header.\n\n\`\`\`\nX-API-Key: gf_dev_trader_aabbccddeeff0022\n\`\`\`\n\n**Development keys (seeded on server start):**\n\n| Key | Scopes | Use for |\n|-----|--------|--------|\n| \`gf_dev_readonly_aabbccddeeff0011\` | read | Dashboards, monitoring |\n| \`gf_dev_trader_aabbccddeeff0022\` | read, write | Price curve editing, simulation |\n| \`gf_dev_admin_aabbccddeeff0033\` | read, write, admin | Key management, mFRR activation |\n\nProduction keys are managed via \`POST /api/v1/api-keys\` (admin scope required).`,
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
    {
      url: 'https://gridio-flex-pa1.vercel.app',
      description: 'Production (simulated data)',
    },
  ],
});

app.get('/api/docs', swaggerUI({ url: '/api/doc' }));

app.onError((err, c) => {
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_root';
      errors[path] = [...(errors[path] ?? []), issue.message];
    }
    return c.json(
      createProblem(
        422,
        'Validation Error',
        'One or more fields failed validation',
        { errors }
      ),
      422
    );
  }
  console.error(err);
  return c.json(
    createProblem(500, 'Internal Server Error', 'An unexpected error occurred'),
    500
  );
});

app.get('/health', (c) =>
  c.json({ status: 'ok', version: 'v1', data: 'simulated' })
);

const PORT = 3000;
console.log(`Gridio Flex API running at http://localhost:${PORT}`);
console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);

await initPriceCache();
scheduleDailyRefresh();
startSimulationClock((now) => {
  console.log(`Sim clock: ${now.toISOString()}`);
});

serve({ fetch: app.fetch, port: PORT });
