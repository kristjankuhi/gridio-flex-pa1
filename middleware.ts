export const config = {
  matcher: '/(.*)',
};

export default function middleware(request: Request): Response | undefined {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // No env vars set — skip auth (local dev)
  if (!user || !pass) {
    return undefined;
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorized();
  }

  const [username, password] = atob(authHeader.slice('Basic '.length)).split(
    ':'
  );

  if (username !== user || password !== pass) {
    return unauthorized();
  }

  return undefined;
}

function unauthorized(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Gridio Flex"',
    },
  });
}
