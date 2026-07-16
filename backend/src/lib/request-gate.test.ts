import { describe, expect, it } from 'vitest';

import { RequestGate } from './request-gate';

describe('RequestGate', () => {
  it('limits requests in a fixed window and recovers after it', async () => {
    let now = 1_000;
    const gate = new RequestGate({
      maxRequests: 2,
      windowMs: 60_000,
      maxConcurrent: 2,
      now: () => now,
    });

    await gate.run(async () => 'first');
    await gate.run(async () => 'second');
    await expect(gate.run(async () => 'third')).rejects.toThrow('RATE_LIMITED');

    now += 60_000;
    await expect(gate.run(async () => 'after-window')).resolves.toBe('after-window');
  });

  it('limits concurrent upstream work', async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gate = new RequestGate({ maxRequests: 10, windowMs: 60_000, maxConcurrent: 1 });
    const first = gate.run(async () => {
      await blocked;
      return 'done';
    });

    await expect(gate.run(async () => 'second')).rejects.toThrow('RATE_LIMITED');
    release();
    await expect(first).resolves.toBe('done');
  });
});
