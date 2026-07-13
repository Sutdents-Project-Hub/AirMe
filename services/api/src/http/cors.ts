import type { HttpRequest } from '@azure/functions';

export function corsHeaders(
  request: HttpRequest,
  allowedOrigins: string[],
): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    vary: 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,X-Request-ID',
    'access-control-max-age': '600',
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}
