-- 留学エージェントの掲載情報（URL・説明会・資料など）と、相談ごとのやり取り
ALTER TABLE providers ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
ALTER TABLE providers ADD COLUMN updated_at TEXT;
CREATE TABLE consultation_messages (id TEXT PRIMARY KEY, consultation_id TEXT NOT NULL REFERENCES consultations(id), user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX consultation_messages_thread ON consultation_messages(consultation_id,created_at);
CREATE INDEX consultation_provider ON consultations(provider_id,created_at);
