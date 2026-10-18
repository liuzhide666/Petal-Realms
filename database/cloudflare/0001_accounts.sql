PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_record TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  credential_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  credential_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS saves (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL CHECK(schema_version = 5),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  payload TEXT NOT NULL CHECK(json_valid(payload) AND length(CAST(payload AS BLOB)) <= 1048576),
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS legacy_links (
  legacy_uid TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  source_revision INTEGER,
  migrated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(reset_at);
