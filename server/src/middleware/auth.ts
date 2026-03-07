import type { MiddlewareHandler } from 'hono';
import { getKeyByValue, markUsed } from '../store/apiKeyStore';
import type { Scope } from '../store/apiKeyStore';
import { createProblem } from '../schemas';

export function requireScope(scope: Scope): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return c.json(
        createProblem(
          401,
          'Unauthorized',
          'Missing Authorization: Bearer <key> header'
        ),
        401
      );
    }

    const entry = getKeyByValue(token);
    if (!entry) {
      return c.json(
        createProblem(401, 'Unauthorized', 'Invalid or revoked API key'),
        401
      );
    }

    if (!entry.scopes.includes(scope)) {
      return c.json(
        createProblem(403, 'Forbidden', `Scope '${scope}' required`),
        403
      );
    }

    markUsed(token);
    await next();
  };
}
