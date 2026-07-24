import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import {
  CloudSyncStateSchema,
  type CloudStateResponse,
  type CloudSyncState,
} from '@airme/contracts';

import type { OperationalStore } from '../database/types';
import type { AccountAuthService } from './account-auth';

export class AccountCloudSyncError extends Error {
  constructor() {
    super('CLOUD_SYNC_UNAVAILABLE');
  }
}

export interface AccountCloudSyncServiceOptions {
  auth: Pick<AccountAuthService, 'getSession'>;
  store: OperationalStore;
  encryptionKey: string;
}

function keyFromBase64url(value: string): Buffer {
  try {
    const key = Buffer.from(value, 'base64url');
    if (key.length !== 32) throw new Error('invalid key length');
    return key;
  } catch {
    throw new Error('CLOUD_SYNC_ENCRYPTION_KEY_INVALID');
  }
}

function encrypt(state: CloudSyncState, key: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(state), 'utf8');
  return {
    ciphertext: Buffer.concat([cipher.update(plaintext), cipher.final()]),
    iv,
    authTag: cipher.getAuthTag(),
  };
}

function decrypt(input: { ciphertext: Buffer; iv: Buffer; authTag: Buffer }, key: Buffer): CloudSyncState {
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, input.iv);
    decipher.setAuthTag(input.authTag);
    const plaintext = Buffer.concat([decipher.update(input.ciphertext), decipher.final()]).toString('utf8');
    return CloudSyncStateSchema.parse(JSON.parse(plaintext));
  } catch {
    throw new AccountCloudSyncError();
  }
}

/** Stores a single encrypted, account-scoped snapshot. Last successful write wins by design. */
export class AccountCloudSyncService {
  private readonly key: Buffer;

  constructor(private readonly options: AccountCloudSyncServiceOptions) {
    this.key = keyFromBase64url(options.encryptionKey);
  }

  async get(token: string | null): Promise<CloudStateResponse> {
    const session = await this.options.auth.getSession(token);
    try {
      const stored = await this.options.store.getAccountCloudState(session.account.id);
      if (!stored) return { state: null, updatedAt: null };
      return { state: decrypt(stored, this.key), updatedAt: stored.updatedAt.toISOString() };
    } catch (error) {
      if (error instanceof AccountCloudSyncError) throw error;
      throw new AccountCloudSyncError();
    }
  }

  async save(token: string | null, state: CloudSyncState): Promise<CloudStateResponse> {
    const session = await this.options.auth.getSession(token);
    try {
      const encrypted = encrypt(CloudSyncStateSchema.parse(state), this.key);
      const updatedAt = await this.options.store.setAccountCloudState({
        accountId: session.account.id,
        ...encrypted,
      });
      return { state: null, updatedAt: updatedAt.toISOString() };
    } catch (error) {
      if (error instanceof AccountCloudSyncError) throw error;
      throw new AccountCloudSyncError();
    }
  }
}
