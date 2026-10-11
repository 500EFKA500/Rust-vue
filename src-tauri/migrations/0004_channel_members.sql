CREATE TABLE channel_members (
  channel_id INTEGER NOT NULL REFERENCES channels(id),
  user_id INTEGER NOT NULL CHECK(user_id IN (1,2)),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(channel_id,user_id)
);
INSERT INTO channel_members(channel_id,user_id) SELECT id,owner_id FROM channels;
INSERT OR IGNORE INTO channel_members(channel_id,user_id) VALUES(1,2);
CREATE TRIGGER channel_owner_subscription AFTER INSERT ON channels
BEGIN INSERT INTO channel_members(channel_id,user_id) VALUES(NEW.id,NEW.owner_id); END;
