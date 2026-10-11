CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '',
  owner_id INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO channels(id, name, description, owner_id)
VALUES(1, 'Общий', 'Прежний чат: история сохранена', 1);
-- SQLite cannot add a REFERENCES column with a non-null DEFAULT to a populated table.
ALTER TABLE messages ADD COLUMN channel_id INTEGER REFERENCES channels(id);
UPDATE messages SET channel_id=1 WHERE channel_id IS NULL;
CREATE TRIGGER messages_channel_required_insert BEFORE INSERT ON messages
WHEN NEW.channel_id IS NULL
BEGIN SELECT RAISE(ABORT, 'channel_id required'); END;
CREATE TRIGGER messages_channel_required_update BEFORE UPDATE OF channel_id ON messages
WHEN NEW.channel_id IS NULL
BEGIN SELECT RAISE(ABORT, 'channel_id required'); END;
CREATE INDEX idx_messages_channel_id ON messages(channel_id, id);
