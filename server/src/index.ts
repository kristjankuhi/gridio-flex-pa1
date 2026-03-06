import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { fleetRoutes } from './routes/fleet';
import { priceCurveRoutes } from './routes/priceCurve';
import { simulationRoutes } from './routes/simulation';

const app = new OpenAPIHono();

app.use('*', cors({ origin: 'http://localhost:5173' }));

app.route('/api/v1', fleetRoutes);
app.route('/api/v1', priceCurveRoutes);
app.route('/api/v1', simulationRoutes);

app.doc('/api/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Gridio Flex API',
    version: 'v1',
    description:
      'Flexibility management API for EV fleet aggregation. Simulated data — POC only.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
});

app.get('/api/docs', swaggerUI({ url: '/api/doc' }));

app.get('/health', (c) =>
  c.json({ status: 'ok', version: 'v1', data: 'simulated' })
);

const PORT = 3000;
console.log(`Gridio Flex API running at http://localhost:${PORT}`);
console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);

serve({ fetch: app.fetch, port: PORT });
