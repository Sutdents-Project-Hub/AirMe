// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Linking } from 'react-native';

import { RoutePlanner } from '../../components/route-planner';

describe('safe route planning fallback', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not claim street-level air quality or real-time navigation before a route is returned', () => {
    render(
      <RoutePlanner
        defaultOrigin={{ name: '高科大第一校區', latitude: 22.754, longitude: 120.335 }}
        environment={null}
        onPlanRoute={vi.fn()}
        onSearchPlaces={vi.fn()}
        route={null}
        routeError={null}
        routeLoading={false}
      />,
    );

    expect(screen.getByText(/先更新環境資料/)).toBeTruthy();
    expect(screen.getByText(/不代表沿途街道濃度/)).toBeTruthy();
    expect(screen.queryByText(/轉彎導航/)).toBeNull();
  });

  it('hands the user to OpenStreetMap only after they actively request an external route', async () => {
    const openUrl = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const onSearchPlaces = vi.fn(async (query: string) => ({
      results:
        query === '高雄車站'
          ? [{ id: 'station', name: '高雄車站', latitude: 22.639, longitude: 120.302 }]
          : [{ id: 'pier-2', name: '駁二藝術特區', latitude: 22.621, longitude: 120.281 }],
      provenance: 'live' as const,
      provider: 'photon' as const,
      attribution: '© OpenStreetMap contributors；地名搜尋：Photon',
    }));
    render(
      <RoutePlanner
        defaultOrigin={{ name: '高科大第一校區', latitude: 22.754, longitude: 120.335 }}
        environment={null}
        onPlanRoute={vi.fn()}
        onSearchPlaces={onSearchPlaces}
        route={{
          origin: { name: '高科大第一校區', latitude: 22.754, longitude: 120.335 },
          destination: { name: '高雄車站', latitude: 22.639, longitude: 120.302 },
          mode: 'walking',
          alternatives: [
            {
              id: 'valhalla-1',
              distanceMeters: 1_200,
              durationSeconds: 900,
              coordinates: [[120.335, 22.754], [120.302, 22.639]],
              steps: [{ instruction: '沿道路前進', distanceMeters: 1_200, durationSeconds: 900 }],
            },
          ],
          generatedAt: '2026-07-22T00:00:00.000Z',
          provenance: 'live',
          provider: 'valhalla',
          attribution: '© OpenStreetMap contributors；路線計算：Valhalla',
        }}
        routeError={null}
        routeLoading={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('要去哪裡？'), { target: { value: '高雄車站' } });
    fireEvent.click(screen.getAllByRole('button', { name: '搜尋' })[1]!);
    fireEvent.click(await screen.findByRole('button', { name: '選擇 高雄車站' }));

    expect(screen.getByText('起點')).toBeTruthy();
    expect(screen.getByText('終點')).toBeTruthy();
    expect(screen.getByText(/只有你主動開啟時，精確起終點才會交給 OpenStreetMap/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '在 OpenStreetMap 查看路線' }));

    expect(openUrl).toHaveBeenCalledTimes(1);
    const target = new URL(openUrl.mock.calls[0]?.[0] ?? '');
    expect(target.origin).toBe('https://www.openstreetmap.org');
    expect(target.pathname).toBe('/directions');
    expect(target.searchParams.get('engine')).toBe('fossgis_osrm_foot');
    expect(target.searchParams.get('route')).toBe('22.754,120.335;22.639,120.302');

    fireEvent.change(screen.getByLabelText('要去哪裡？'), { target: { value: '駁二藝術特區' } });
    fireEvent.click(screen.getAllByRole('button', { name: '搜尋' })[1]!);
    fireEvent.click(await screen.findByRole('button', { name: '選擇 駁二藝術特區' }));

    expect(screen.queryByText('選擇的方案')).toBeNull();
    expect(screen.queryByRole('button', { name: '在 OpenStreetMap 查看路線' })).toBeNull();
  });
});
