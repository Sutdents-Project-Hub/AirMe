// @vitest-environment jsdom

import type { RouteResponse } from '@airme/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteMap } from '../../components/route-map.web';

vi.mock('maplibre-gl', () => {
  class Map {
    addLayer = vi.fn();
    addSource = vi.fn();
    fitBounds = vi.fn();
    getCanvas = () => document.createElement('canvas');
    on = (event: string, target: unknown, callback?: () => void) => {
      const handler = typeof target === 'function' ? target : callback;
      if (event === 'load') handler?.();
    };
    remove = vi.fn();
  }
  return { Map };
});

const route: RouteResponse = {
  origin: { name: '高科大第一校區', latitude: 22.754321, longitude: 120.333221 },
  destination: { name: '楠梓運動中心', latitude: 22.726543, longitude: 120.303211 },
  mode: 'cycling',
  alternatives: [
    {
      id: 'main-route',
      distanceMeters: 4_250,
      durationSeconds: 1_020,
      coordinates: [
        [120.333221, 22.754321],
        [120.315, 22.74],
        [120.303211, 22.726543],
      ],
      steps: [{ instruction: '沿校園路前進', distanceMeters: 4_250, durationSeconds: 1_020 }],
    },
  ],
  generatedAt: '2026-07-20T08:00:00.000Z',
  provenance: 'fixture',
  provider: 'airme-fixture',
  attribution: 'AirMe fixture · OpenStreetMap contributors',
};

describe('web route map', () => {
  it('dynamically initializes MapLibre and retains the route safety boundary', async () => {
    render(<RouteMap onSelectRoute={vi.fn()} route={route} selectedRouteId="main-route" />);

    await waitFor(() => {
      expect(screen.queryByText('正在載入可互動地圖')).toBeNull();
    });

    expect(screen.getByRole('region', { name: /從 高科大第一校區 到 楠梓運動中心/ })).toBeTruthy();
    expect(screen.getByText(/路線：AirMe fixture/)).toBeTruthy();
    expect(screen.getByText(/不提供轉彎導航或沿途空氣品質判定/)).toBeTruthy();
  });
});
