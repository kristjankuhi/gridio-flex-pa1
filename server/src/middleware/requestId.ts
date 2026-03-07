import type { MiddlewareHandler } from 'hono';

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const id = c.req.header('X-Request-ID') ?? crypto.randomUUID();
  await next();
  c.res.headers.set('X-Request-ID', id);
  c.res.headers.set('X-API-Version', 'v1');
};
