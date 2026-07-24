import { describe, expect, it, vi } from 'vitest';

import { withFallback } from './fallback';

const location = { name: '臺北市', administrativeArea: '臺北市' as const, latitude: 25.033, longitude: 121.565 };

describe('environment source fallback', () => {
  it('uses the primary source without calling the fallback when it succeeds', async () => {
    const fallback = vi.fn().mockResolvedValue('fallback');
    await expect(withFallback(vi.fn().mockResolvedValue('official'), fallback)(location)).resolves.toBe('official');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('uses the clearly labelled fallback only after the primary source fails', async () => {
    const fallback = vi.fn().mockResolvedValue('modelled');
    await expect(withFallback(vi.fn().mockRejectedValue(new Error('provider failed')), fallback)(location)).resolves.toBe('modelled');
    expect(fallback).toHaveBeenCalledWith(location);
  });
});
