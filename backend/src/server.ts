import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import { createApplication } from './application';
import { readApiConfig } from './config';
import type { OperationalStore } from './database/types';
import type { ApiHandlers, ApiRequest } from './http/handlers';
import type { HttpResponse } from './http/respond';

function toApiRequest(request: FastifyRequest): ApiRequest {
  const protocol = request.protocol || 'http';
  const host = request.headers.host || 'localhost';
  return {
    method: request.method,
    headers: new Headers(
      Object.entries(request.headers).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value.join(',') : value]],
      ),
    ),
    url: new URL(request.raw.url || '/', `${protocol}://${host}`).toString(),
    json: async () => request.body,
  };
}

async function sendResponse(response: HttpResponse, reply: FastifyReply): Promise<unknown> {
  return reply.code(response.status).headers(response.headers).send(response.jsonBody);
}

export function createServer(input: { handlers: ApiHandlers; store: OperationalStore | null }): FastifyInstance {
  const server = Fastify({ logger: false, trustProxy: true });
  const register = (
    method: 'GET' | 'POST',
    path: string,
    handler: (request: ApiRequest) => Promise<HttpResponse>,
  ) => {
    server.route({
      method: [method, 'OPTIONS'],
      url: path,
      handler: async (request, reply) => sendResponse(await handler(toApiRequest(request)), reply),
    });
  };

  register('GET', '/api/health', input.handlers.health);
  register('GET', '/api/environment', input.handlers.environment);
  register('POST', '/api/recommendations', input.handlers.recommendations);
  register('POST', '/api/follow-ups', input.handlers.followUps);

  server.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? '';
    if (!input.store || !route.startsWith('/api/')) return;
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();
    const normalizedRequestId = Array.isArray(requestId) ? requestId[0] : requestId;
    await input.store
      .recordRequestEvent({
        requestId: normalizedRequestId.slice(0, 128),
        route,
        statusCode: reply.statusCode,
        durationMs: reply.elapsedTime ?? 0,
      })
      .catch(() => undefined);
  });

  return server;
}

async function main(): Promise<void> {
  const config = readApiConfig();
  const application = createApplication();
  const server = createServer(application);
  const close = async () => {
    await server.close();
    await application.store?.close();
  };
  process.once('SIGTERM', () => void close());
  process.once('SIGINT', () => void close());
  await server.listen({ host: config.host, port: config.port });
}

void main().catch(() => {
  process.stderr.write('AirMe API 無法啟動。請確認必要的環境變數與資料庫連線。\n');
  process.exitCode = 1;
});
