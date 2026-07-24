import { describe, expect, it, vi } from 'vitest';

import { AccountCloudSyncService } from './account-cloud-sync';

const key = Buffer.alloc(32, 7).toString('base64url');
const token = 'x'.repeat(43);
const state = {
  version: 1 as const,
  deviceProfile: { displayName: '我的 AirMe' },
  profile: { ageGroup: 'teen' as const, sensitiveConditions: [], commuteMode: 'walk' as const },
  savedLocation: { name: '臺北市', administrativeArea: '臺北市' as const, latitude: 25.033, longitude: 121.565 },
  onboardingCompleted: true,
  history: [],
  feedback: [],
  demoMode: false,
};

describe('AccountCloudSyncService', () => {
  it('encrypts a validated account snapshot before it reaches the store', async () => {
    const store = {
      getAccountCloudState: vi.fn(),
      setAccountCloudState: vi.fn().mockResolvedValue(new Date('2026-07-22T03:00:00.000Z')),
    };
    const auth = {
      getSession: vi.fn().mockResolvedValue({
        account: { id: 'e32970f0-5877-4939-aa10-a3acb145ee3c', email: 'test@example.com', displayName: '測試', createdAt: '2026-07-22T00:00:00.000Z' },
        expiresAt: '2026-08-22T00:00:00.000Z',
      }),
    };
    const service = new AccountCloudSyncService({ auth, store: store as never, encryptionKey: key });

    await expect(service.save(token, state)).resolves.toEqual({ state: null, updatedAt: '2026-07-22T03:00:00.000Z' });
    const saved = store.setAccountCloudState.mock.calls[0]?.[0] as {
      ciphertext: Buffer;
      iv: Buffer;
      authTag: Buffer;
    };
    expect(saved.ciphertext.toString('utf8')).not.toContain('我的 AirMe');
    expect(saved.iv).toHaveLength(12);
    expect(saved.authTag).toHaveLength(16);
  });

  it('decrypts only state encrypted by the configured backend key', async () => {
    let encrypted: { ciphertext: Buffer; iv: Buffer; authTag: Buffer } | null = null;
    const account = { id: 'e32970f0-5877-4939-aa10-a3acb145ee3c', email: 'test@example.com', displayName: '測試', createdAt: '2026-07-22T00:00:00.000Z' };
    const store = {
      getAccountCloudState: vi.fn(async () =>
        encrypted ? { ...encrypted, updatedAt: new Date('2026-07-22T03:00:00.000Z') } : null,
      ),
      setAccountCloudState: vi.fn(async (input) => {
        encrypted = input;
        return new Date('2026-07-22T03:00:00.000Z');
      }),
    };
    const auth = { getSession: vi.fn().mockResolvedValue({ account, expiresAt: '2026-08-22T00:00:00.000Z' }) };
    const service = new AccountCloudSyncService({ auth, store: store as never, encryptionKey: key });

    await service.save(token, state);
    await expect(service.get(token)).resolves.toEqual({ state, updatedAt: '2026-07-22T03:00:00.000Z' });
  });
});
