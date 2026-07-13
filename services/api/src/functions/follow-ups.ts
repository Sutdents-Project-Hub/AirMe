import { app } from '@azure/functions';

import { apiHandlers } from '../application';

app.http('follow-ups', {
  route: 'follow-ups',
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: (request) => apiHandlers.followUps(request),
});
