CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_path TEXT,
  status TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT ''
);
-- Старые общие чаты остаются в базе как архив, но не получают участников
-- и больше не показываются или выдаются через API.
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  mime TEXT NOT NULL,
  data BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('text', 'image')),
  body TEXT,
  attachment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS messages_chat ON messages(chat_id, id);
-- Не переиспользуем id удалённых постов: иначе ломаются счётчики прочитанного.
CREATE TABLE IF NOT EXISTS message_sequence (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  last_id INTEGER NOT NULL
);
INSERT OR IGNORE INTO message_sequence VALUES (1, 0);
UPDATE message_sequence SET last_id = MAX(last_id, COALESCE((SELECT MAX(id) FROM messages), 0));
CREATE TRIGGER IF NOT EXISTS message_sequence_insert AFTER INSERT ON messages
BEGIN
  UPDATE message_sequence SET last_id = MAX(last_id, NEW.id) WHERE singleton = 1;
END;
CREATE TABLE IF NOT EXISTS chat_read_state (
  user_id INTEGER NOT NULL REFERENCES users(id),
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, chat_id)
);
CREATE TABLE IF NOT EXISTS user_chat_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  selected_chat_id INTEGER REFERENCES chats(id)
);
CREATE TABLE IF NOT EXISTS direct_chats (
  chat_id INTEGER PRIMARY KEY REFERENCES chats(id),
  low_user_id INTEGER NOT NULL REFERENCES users(id),
  high_user_id INTEGER NOT NULL REFERENCES users(id),
  CHECK(low_user_id < high_user_id),
  UNIQUE(low_user_id, high_user_id)
);
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  muted INTEGER NOT NULL DEFAULT 0 CHECK(muted IN (0, 1)),
  pinned_at INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0, 1)),
  cleared_before_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(chat_id, user_id)
);
CREATE INDEX IF NOT EXISTS member_user ON chat_members(user_id, hidden);
CREATE TABLE IF NOT EXISTS group_chats (
  chat_id INTEGER PRIMARY KEY REFERENCES chats(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS appearance_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark', 'light', 'system')),
  accent TEXT NOT NULL DEFAULT 'blue' CHECK(accent IN ('blue', 'purple', 'green', 'orange', 'pink')),
  font_size INTEGER NOT NULL DEFAULT 14 CHECK(font_size BETWEEN 12 AND 20),
  background TEXT NOT NULL DEFAULT 'plain' CHECK(background IN ('plain', 'dots', 'gradient')),
  compact INTEGER NOT NULL DEFAULT 0 CHECK(compact IN (0, 1))
);
CREATE TABLE IF NOT EXISTS channel_chats (
  chat_id INTEGER PRIMARY KEY REFERENCES chats(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  avatar_path TEXT,
  comments_enabled INTEGER NOT NULL DEFAULT 1 CHECK(comments_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS channel_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS comments_post ON channel_comments(post_id, id);
CREATE TABLE IF NOT EXISTS channel_views (
  post_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY(post_id, user_id)
);
