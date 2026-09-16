CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL,

    subtitle TEXT NOT NULL DEFAULT ''
);

-- Создаем первый чат
-- OR IGNORE - если строка с id уже существует, то игнорируем
INSERT OR IGNORE INTO chats (id, title, subtitle)
VALUES (1, 'Общий чат', 'Основная беседа');

INSERT OR IGNORE INTO chats (id, title, subtitle)
VALUES (2, 'Игры 67', 'Игровой чат');

INSERT OR IGNORE INTO chats (id, title, subtitle)
VALUES (3, 'Опять работа', 'Проекты и задачи');

ALTER TABLE messages
ADD COLUMN chat_id INTEGER NOT NULL DEFAULT 1;