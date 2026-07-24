import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import { createApplication } from './application';
import { readApiConfig } from './config';
import type { OperationalStore } from './database/types';
import { corsHeaders } from './http/cors';
import type { ApiHandlers, ApiRequest } from './http/handlers';
import { errorResponse, type HttpResponse } from './http/respond';

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

export function createServer(input: {
  handlers: ApiHandlers;
  store: OperationalStore | null;
  allowedOrigins?: string[];
}): FastifyInstance {
  const server = Fastify({ logger: false, trustProxy: true, bodyLimit: 32 * 1_024 });

  server.setErrorHandler((error, request, reply) => {
    const errorStatus =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500;
    const status = errorStatus === 413 ? 413 : errorStatus === 400 ? 400 : 500;
    const headers = corsHeaders(toApiRequest(request), input.allowedOrigins ?? []);
    const response = errorResponse({
      status,
      code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
      message:
        status === 413
          ? '輸入內容過大，請縮短後再試。'
          : status === 400
            ? '請檢查輸入內容是否為正確格式。'
            : '服務暫時無法完成，請稍後再試或使用決賽示範模式。',
      retryable: status === 500,
      requestId: crypto.randomUUID(),
      headers,
    });
    return sendResponse(response, reply);
  });
  const register = (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    handler: (request: ApiRequest) => Promise<HttpResponse>,
  ) => {
    server.route({
      method,
      url: path,
      handler: async (request, reply) => sendResponse(await handler(toApiRequest(request)), reply),
    });
  };

  server.options('/api/*', async (request, reply) => {
    const headers = corsHeaders(toApiRequest(request), input.allowedOrigins ?? []);
    return reply.code(204).headers(headers).send();
  });

  register('GET', '/api/health', input.handlers.health);
  register('POST', '/api/environment', input.handlers.environment);
  register('POST', '/api/activity-intents', input.handlers.activityIntents);
  register('POST', '/api/recommendations', input.handlers.recommendations);
  register('POST', '/api/follow-ups', input.handlers.followUps);
  register('POST', '/api/auth/register', input.handlers.register);
  register('POST', '/api/auth/login', input.handlers.login);
  register('GET', '/api/auth/session', input.handlers.session);
  register('POST', '/api/auth/logout', input.handlers.logout);
  register('DELETE', '/api/auth/account', input.handlers.deleteAccount);
  register('GET', '/api/account/state', input.handlers.getCloudState);
  register('PUT', '/api/account/state', input.handlers.saveCloudState);
  register('POST', '/api/routes', input.handlers.routes);
  register('POST', '/api/geocoding/search', input.handlers.geocodingSearch);

  server.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? '';
    if (!input.store || !route.startsWith('/api/')) return;
    const normalizedRequestId = crypto.randomUUID();
    await input.store
      .recordRequestEvent({
        requestId: normalizedRequestId,
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

if (require.main === module) {
  void main().catch(() => {
    process.stderr.write('AirMe API 無法啟動。請確認必要的環境變數與資料庫連線。\n');
    process.exitCode = 1;
  });
}
