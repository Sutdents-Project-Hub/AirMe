-- Account data is intentionally limited to login identity, display name, recorded
-- privacy consent, a password verifier, and opaque session digests. Do not add
-- local profile, activity, recommendation, or feedback payloads to these tables.
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  password_hash TEXT NOT NULL,
  privacy_consented_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_sessions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_sessions_active_token_idx
  ON account_sessions (token_digest)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS account_sessions_account_id_idx
  ON account_sessions (account_id);
