import { describe, expect, it } from 'vitest';

import { readApiConfig } from './config';

describe('readApiConfig', () => {
  it('creates a new fixture-only context secret when none is configured', () => {
    const first = readApiConfig({ AI_MODE: 'fixture' });
    const second = readApiConfig({ AI_MODE: 'fixture' });

    expect(first.contextSigningSecret).toHaveLength(43);
    expect(second.contextSigningSecret).not.toBe(first.contextSigningSecret);
  });

  it('requires a configured context secret in live mode', () => {
    expect(() => readApiConfig({ AI_MODE: 'live' })).toThrow('CONTEXT_SIGNING_SECRET_REQUIRED');
  });
});
