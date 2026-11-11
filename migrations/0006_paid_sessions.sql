-- Paid consultations with experienced students (phase 1). Advisor approval columns are written only by admin routes.
CREATE TABLE advisor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'none' CHECK(status IN ('none','pending','approved','rejected','suspended')),
  accepting INTEGER NOT NULL DEFAULT 0,
  availability TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  birth_date TEXT,
  terms_agreed_at TEXT,
  applied_at TEXT,
  verified_at TEXT,
  verified_by TEXT,
  review_reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Verification documents: visible only to admins, deleted on approval or rejection.
CREATE TABLE advisor_documents (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE paid_sessions (
  id TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES users(id),
  client_id TEXT NOT NULL REFERENCES users(id),
  room_id TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','paid','completed','settled','declined','expired','cancelled','refund_pending','refunded','disputed')),
  topic TEXT NOT NULL CHECK(length(topic) BETWEEN 10 AND 1000),
  slots TEXT NOT NULL,
  minor_consent INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT,
  call_url TEXT,
  amount INTEGER NOT NULL,
  advisor_amount INTEGER NOT NULL,
  fee_amount INTEGER NOT NULL,
  accept_expires_at INTEGER NOT NULL,
  pay_expires_at INTEGER,
  stripe_session_id TEXT UNIQUE,
  payment_intent TEXT,
  paid_at INTEGER,
  completed_at INTEGER,
  settle_at INTEGER,
  report_reason TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  cancelled_by TEXT,
  payout_paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(advisor_id!=client_id)
);
CREATE INDEX paid_sessions_advisor ON paid_sessions(advisor_id,status);
CREATE INDEX paid_sessions_client ON paid_sessions(client_id,status);
CREATE UNIQUE INDEX one_open_session ON paid_sessions(client_id,advisor_id) WHERE status IN ('requested','accepted');
