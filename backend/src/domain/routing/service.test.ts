import { describe, expect, it, vi } from 'vitest';

import { getRoutingFixture } from '../../adapters/routing/fixture';
import type { RoutingAdapter } from '../../adapters/routing/types';
import { createRoutingService } from './service';

const request = {
  origin: { name: '臺北車站', latitude: 25.047708, longitude: 121.517039 },
  destination: { name: '中正紀念堂', latitude: 25.032404, longitude: 121.519883 },
  mode: 'cycling' as const,
  alternatives: 1,
  dataMode: 'fixture' as const,
};

describe('createRoutingService', () => {
  it('uses only the deterministic fixture adapter in fixture mode', async () => {
    const route = vi.fn<RoutingAdapter['route']>();
    const service = createRoutingService({ live: { route } });

    await expect(service.getRoute(request)).resolves.toEqual(getRoutingFixture(request));
    expect(route).not.toHaveBeenCalled();
  });

  it('uses the live adapter only when the request explicitly selects live data', async () => {
    const liveResponse = {
      ...getRoutingFixture({ ...request, dataMode: 'fixture' as const }),
      provenance: 'live' as const,
      provider: 'valhalla' as const,
      attribution: '© OpenStreetMap contributors；路線計算：Valhalla',
    };
    const route = vi.fn<RoutingAdapter['route']>().mockResolvedValue(liveResponse);
    const service = createRoutingService({ live: { route } });

    await expect(service.getRoute({ ...request, dataMode: 'live' })).resolves.toEqual(liveResponse);
    expect(route).toHaveBeenCalledWith({ ...request, dataMode: 'live' });
  });

  it('normalizes every live provider failure to ROUTING_UNAVAILABLE', async () => {
    const service = createRoutingService({
      live: { route: vi.fn().mockRejectedValue(new Error('private upstream detail')) },
    });

    await expect(service.getRoute({ ...request, dataMode: 'live' })).rejects.toThrow(
      'ROUTING_UNAVAILABLE',
    );
  });
});
