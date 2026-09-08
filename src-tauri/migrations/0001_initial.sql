-- создание таблицы сообщений
CREATE TABLE IF NOT EXISTS messages (
  -- уникальный номер соо
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- имя автора соо
  author TEXT NOT NULL,

  -- текст соо
  body TEXT NOT NULL,

  -- время создания
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);