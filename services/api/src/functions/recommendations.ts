import { app } from '@azure/functions';

import { apiHandlers } from '../application';

app.http('recommendations', {
  route: 'recommendations',
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: (request) => apiHandlers.recommendations(request),
});
