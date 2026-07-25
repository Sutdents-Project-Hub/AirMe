import { describe, expect, it, vi } from 'vitest';

import type { ApiHandlers } from './http/handlers';
import { createServer } from './server';

function handlers(): ApiHandlers {
  const unused = vi.fn().mockRejectedValue(new Error('handler should not run'));
  return {
    health: unused,
    environment: unused,
    activityIntents: unused,
    recommendations: unused,
    followUps: unused,
    register: unused,
    login: unused,
    session: unused,
    logout: unused,
    deleteAccount: unused,
    getCloudState: unused,
    saveCloudState: unused,
    routes: unused,
    geocodingSearch: unused,
  };
}

describe('Fastify transport errors', () => {
  it('returns an API status response at the root URL', async () => {
    const server = createServer({ handlers: handlers(), store: null });

    const response = await server.inject({ method: 'GET', url: '/' });
    await server.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'airme-api',
      health: '/api/health',
    });
  });

  it('normalizes malformed JSON and keeps allowed CORS headers', async () => {
    const server = createServer({
      handlers: handlers(),
      store: null,
      allowedOrigins: ['https://airme.example'],
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/activity-intents',
      headers: {
        'content-type': 'application/json',
        origin: 'https://airme.example',
      },
      payload: '{',
    });
    await server.close();

    expect(response.statusCode).toBe(400);
    expect(response.headers['access-control-allow-origin']).toBe('https://airme.example');
    expect(response.json().error).toMatchObject({
      code: 'INVALID_REQUEST',
      retryable: false,
    });
    expect(response.body).not.toContain('FST_ERR');
  });

  it('normalizes oversized request bodies', async () => {
    const server = createServer({ handlers: handlers(), store: null });

    const response = await server.inject({
      method: 'POST',
      url: '/api/recommendations',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ activityText: 'a'.repeat(40_000) }),
    });
    await server.close();

    expect(response.statusCode).toBe(413);
    expect(response.json().error).toMatchObject({
      code: 'INVALID_REQUEST',
      retryable: false,
    });
    expect(response.json().error.message).toContain('輸入內容過大');
  });
});
