// @vitest-environment jsdom

import type { RouteResponse } from '@airme/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteMap } from '../../components/route-map';

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
    {
      id: 'alternate-route',
      distanceMeters: 4_800,
      durationSeconds: 1_140,
      coordinates: [
        [120.333221, 22.754321],
        [120.32, 22.735],
        [120.303211, 22.726543],
      ],
      steps: [{ instruction: '沿外環道路前進', distanceMeters: 4_800, durationSeconds: 1_140 }],
    },
  ],
  generatedAt: '2026-07-20T08:00:00.000Z',
  provenance: 'fixture',
  provider: 'airme-fixture',
  attribution: 'AirMe fixture · OpenStreetMap contributors',
};

describe('route map fallback', () => {
  it('keeps route selection accessible without claiming live navigation or street-level air quality', () => {
    const onSelectRoute = vi.fn();
    render(<RouteMap onSelectRoute={onSelectRoute} route={route} selectedRouteId="main-route" />);

    expect(screen.getByText('此裝置目前無法載入地圖預覽')).toBeTruthy();
    expect(screen.getByText(/不提供轉彎導航/)).toBeTruthy();
    expect(screen.getByText(/不會判定沿途空氣品質/)).toBeTruthy();
    expect(screen.getByText(/4\.25 公里 · 17 分鐘/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /路線方案 2/ }));
    expect(onSelectRoute).toHaveBeenCalledWith('alternate-route');
  });

  it('shows a clear non-map state before a route response exists', () => {
    render(<RouteMap onSelectRoute={vi.fn()} route={null} selectedRouteId={null} />);

    expect(screen.getByText('目前尚未取得可顯示的路線')).toBeTruthy();
    expect(screen.getByText(/不會以此提供即時導航/)).toBeTruthy();
  });
});
