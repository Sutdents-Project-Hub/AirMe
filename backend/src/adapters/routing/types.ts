import type { RouteRequest, RouteResponse } from '@airme/contracts';

/**
 * An external routing provider.  Route requests are intentionally transient:
 * implementations must not persist the names or coordinates in a request.
 */
export interface RoutingAdapter {
  route(request: RouteRequest): Promise<RouteResponse>;
}

export type LoadRoute = RoutingAdapter['route'];
