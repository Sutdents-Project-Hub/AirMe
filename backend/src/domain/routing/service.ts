import type { DataMode, RouteRequest, RouteResponse } from '@airme/contracts';

import type { RoutingAdapter } from '../../adapters/routing/types';
import { getRoutingFixture } from '../../adapters/routing/fixture';

export interface RoutingService {
  getRoute(request: RouteRequest): Promise<RouteResponse>;
}

export interface RoutingServiceOptions {
  live: RoutingAdapter;
  getFixture?: (request: RouteRequest) => RouteResponse;
}

function unavailable(): Error {
  return new Error('ROUTING_UNAVAILABLE');
}

/**
 * Keeps the Demo/Live policy outside HTTP handlers.  It has no cache or store by design: route
 * point names and precise coordinates are request-scoped and must never be persisted.
 */
export function createRoutingService(options: RoutingServiceOptions): RoutingService {
  const getFixture = options.getFixture ?? getRoutingFixture;

  return {
    async getRoute(request: RouteRequest): Promise<RouteResponse> {
      const mode: DataMode = request.dataMode;
      if (mode === 'fixture') return getFixture(request);

      try {
        return await options.live.route(request);
      } catch {
        throw unavailable();
      }
    },
  };
}
