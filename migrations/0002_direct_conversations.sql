-- Existing group rooms and their history are preserved. Each direct room has one fixed pair.
CREATE TABLE direct_conversations (
  room_id TEXT PRIMARY KEY REFERENCES rooms(id),
  user_low TEXT NOT NULL REFERENCES users(id),
  user_high TEXT NOT NULL REFERENCES users(id),
  CHECK(user_low < user_high),
  UNIQUE(user_low, user_high)
);
CREATE TRIGGER direct_pair_members BEFORE INSERT ON direct_conversations
WHEN EXISTS (SELECT 1 FROM room_members WHERE room_id=NEW.room_id AND user_id NOT IN (NEW.user_low,NEW.user_high))
BEGIN SELECT RAISE(ABORT,'Direct conversation can only contain its two participants'); END;
CREATE TRIGGER direct_member_insert BEFORE INSERT ON room_members
WHEN EXISTS (SELECT 1 FROM direct_conversations WHERE room_id=NEW.room_id AND NEW.user_id NOT IN (user_low,user_high))
BEGIN SELECT RAISE(ABORT,'Direct conversation can only contain its two participants'); END;
CREATE TRIGGER direct_member_update BEFORE UPDATE ON room_members
WHEN EXISTS (SELECT 1 FROM direct_conversations WHERE room_id=NEW.room_id AND NEW.user_id NOT IN (user_low,user_high))
BEGIN SELECT RAISE(ABORT,'Direct conversation can only contain its two participants'); END;
