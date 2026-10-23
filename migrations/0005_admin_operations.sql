-- Admin authentication is deferred. Only a future, separately verified admin flow may issue these sessions.
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','suspended'));
ALTER TABLE users ADD COLUMN status_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE talks ADD COLUMN cancelled_at TEXT;
ALTER TABLE talks ADD COLUMN cancellation_reason TEXT;
CREATE INDEX admin_sessions_user ON admin_sessions(user_id);
