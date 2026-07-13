import { createHmac, timingSafeEqual } from 'node:crypto';

import type { EnvironmentSnapshot, RiskLevel } from '@airme/contracts';

export interface RecommendationContext {
  activitySummary: string;
  locationName: string;
  environment: {
    aqi: number;
    category: EnvironmentSnapshot['airQuality']['category'];
    weatherSummary: string;
  };
  minimumRiskLevel: RiskLevel;
  restrictions: string[];
}

interface SignedEnvelope {
  version: 1;
  issuedAt: number;
  expiresAt: number;
  context: RecommendationContext;
}

interface ContextTokenOptions {
  secret: string;
  ttlSeconds: number;
  now?: () => Date;
}

export class ContextTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired') {
    super(reason === 'expired' ? 'CONTEXT_EXPIRED' : 'CONTEXT_INVALID');
    this.name = 'ContextTokenError';
  }
}

export class ContextTokenService {
  private readonly now: () => Date;

  constructor(private readonly options: ContextTokenOptions) {
    if (options.secret.length < 16) throw new Error('CONTEXT_SECRET_TOO_SHORT');
    if (!Number.isInteger(options.ttlSeconds) || options.ttlSeconds <= 0) {
      throw new Error('CONTEXT_TTL_INVALID');
    }
    this.now = options.now ?? (() => new Date());
  }

  sign(context: RecommendationContext): string {
    const issuedAt = Math.floor(this.now().getTime() / 1_000);
    const envelope: SignedEnvelope = {
      version: 1,
      issuedAt,
      expiresAt: issuedAt + this.options.ttlSeconds,
      context,
    };
    const encoded = Buffer.from(JSON.stringify(envelope)).toString('base64url');
    return `${encoded}.${this.signature(encoded)}`;
  }

  verify(token: string): RecommendationContext {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra) throw new ContextTokenError('invalid');

    const expected = Buffer.from(this.signature(encoded));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new ContextTokenError('invalid');
    }

    let envelope: SignedEnvelope;
    try {
      envelope = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedEnvelope;
    } catch {
      throw new ContextTokenError('invalid');
    }

    if (
      envelope.version !== 1 ||
      !Number.isInteger(envelope.expiresAt) ||
      typeof envelope.context?.activitySummary !== 'string' ||
      typeof envelope.context?.locationName !== 'string' ||
      !Array.isArray(envelope.context?.restrictions)
    ) {
      throw new ContextTokenError('invalid');
    }

    if (Math.floor(this.now().getTime() / 1_000) >= envelope.expiresAt) {
      throw new ContextTokenError('expired');
    }
    return envelope.context;
  }

  private signature(encoded: string): string {
    return createHmac('sha256', this.options.secret).update(encoded).digest('base64url');
  }
}
