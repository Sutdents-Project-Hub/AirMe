import { app } from '@azure/functions';

import { apiHandlers } from '../application';

app.http('environment', {
  route: 'environment',
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: (request) => apiHandlers.environment(request),
});
