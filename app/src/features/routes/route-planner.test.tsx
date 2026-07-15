// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoutePlanner } from '../../components/route-planner';

describe('safe route planning fallback', () => {
  it('never invents route metrics or street-level air quality', () => {
    render(<RoutePlanner defaultOrigin="高科大第一校區" environment={null} />);

    fireEvent.change(screen.getByLabelText('要去哪裡？'), { target: { value: '楠梓運動中心' } });
    fireEvent.change(screen.getByLabelText('想怎麼移動？'), { target: { value: '騎單車' } });
    fireEvent.click(screen.getByRole('button', { name: '整理出發前方案' }));

    expect(screen.getByText('沿途空品資料不足')).toBeTruthy();
    expect(screen.getByText(/無法分辨相鄰街道/)).toBeTruthy();
    expect(screen.queryByText(/公里|分鐘車程/)).toBeNull();
  });
});
