CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '',
  owner_id INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO channels(id, name, description, owner_id)
VALUES(1, 'Общий', 'Прежний чат: история сохранена', 1);
ALTER TABLE messages ADD COLUMN channel_id INTEGER NOT NULL DEFAULT 1 REFERENCES channels(id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id, id);
