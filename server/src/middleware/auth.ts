import type { MiddlewareHandler } from 'hono';
import { lookup, touch } from '../store/apiKeyStore';
import type { Scope } from '../store/apiKeyStore';

declare module 'hono' {
  interface ContextVariableMap {
    apiKey: NonNullable<ReturnType<typeof lookup>>;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('X-API-Key');
  if (!key) {
    return c.json(
      {
        type: 'https://gridio.io/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'X-API-Key header is required',
      },
      401
    );
  }
  const apiKey = lookup(key);
  if (!apiKey) {
    return c.json(
      {
        type: 'https://gridio.io/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid API key',
      },
      401
    );
  }
  touch(key);
  c.set('apiKey', apiKey);
  await next();
};

export function requireScope(scope: Scope): MiddlewareHandler {
  return async (c, next) => {
    const apiKey = c.get('apiKey');
    if (!apiKey.scopes.includes(scope)) {
      return c.json(
        {
          type: 'https://gridio.io/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `Scope '${scope}' required`,
        },
        403
      );
    }
    await next();
  };
}
