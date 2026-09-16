-- Создание таблицы сообщений
CREATE TABLE IF NOT EXISTS messages (
    -- Уникальный номер сообщения
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Имя автора сообщения
    author TEXT NOT NULL,

    -- Текст сообщения
    body TEXT NOT NULL,

    -- Время создания
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);