import { app } from '@azure/functions';

import { apiHandlers } from '../application';

app.http('health', {
  route: 'health',
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: (request) => apiHandlers.health(request),
});
