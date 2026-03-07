import type { MiddlewareHandler } from 'hono';
import type {} from '../middleware/auth';

interface CachedResponse {
  status: number;
  body: unknown;
  createdAt: Date;
}

const cache = new Map<string, CachedResponse>();
const TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now - v.createdAt.getTime() > TTL_MS) cache.delete(k);
  }
}, 60_000);

export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  const iKey = c.req.header('Idempotency-Key');
  if (!iKey) {
    await next();
    return;
  }

  const apiKey = c.get('apiKey');
  const cacheKey = `${apiKey.id}:${iKey}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    c.header('Idempotent-Replayed', 'true');
    return c.json(cached.body, cached.status as never);
  }

  await next();

  if (c.res.status >= 200 && c.res.status < 300) {
    const cloned = c.res.clone();
    const body = await cloned.json();
    cache.set(cacheKey, { status: c.res.status, body, createdAt: new Date() });
  }
};
