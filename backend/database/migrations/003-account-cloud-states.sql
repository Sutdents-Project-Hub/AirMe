-- Encrypted account state for cross-device sync. The encryption key is held
-- only in the backend runtime environment, never in the database or App.
CREATE TABLE IF NOT EXISTS account_cloud_states (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  ciphertext BYTEA NOT NULL,
  iv BYTEA NOT NULL CHECK (octet_length(iv) = 12),
  auth_tag BYTEA NOT NULL CHECK (octet_length(auth_tag) = 16),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_cloud_states_updated_at_idx
  ON account_cloud_states (updated_at);
