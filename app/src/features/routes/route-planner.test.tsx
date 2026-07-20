// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoutePlanner } from '../../components/route-planner';

describe('safe route planning fallback', () => {
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
});
