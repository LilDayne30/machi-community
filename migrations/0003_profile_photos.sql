CREATE TABLE profile_photos (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content BLOB NOT NULL CHECK(length(content) BETWEEN 1 AND 196608),
  version TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
