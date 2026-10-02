CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_path TEXT,
    status TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (
       id, username, display_name, status
)
VALUES (
       1,
       'oleg',
       'Олег',
       'online'
);

INSERT OR IGNORE INTO users (
       id, username, display_name, status
)
VALUES (
       2,
       'kirill228',
       'Кирилл',
       'online'
);

INSERT OR IGNORE INTO users (
       id, username, display_name, status
)
VALUES (
       3,
       'misha67',
       'misha67',
       'online'
);

INSERT OR IGNORE INTO users (
       username,
       display_name
)
SELECT
    -- Технический username legacy_1 legacy_2 ...
    -- CAST превращает число в текст
    'legacy_' || CAST(old_authors.first_message_id AS TEXT),
    old_authors.author
FROM (
    SELECT
        -- MIN(id) берем самый малый id соо для этого пользователя
        MIN(id) AS first_message_id,
        author
    FROM messages
    -- создаем одну группу для каждого имени автора
    GROUP BY author
) AS old_authors

WHERE NOT EXISTS(
    SELECT 1
    FROM users
    WHERE users.display_name = old_authors.author
);


CREATE TABLE messages_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL
        REFERENCES chats(id) -- ссылка на user.id
        ON DELETE CASCADE, -- связанные с ним соо также будут удалены

    author_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT, -- нельзя удалить пользователя

    type TEXT NOT NULL DEFAULT 'text',

    body TEXT,

    attachment TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- проверяет и разрешает только типы из данного списка
    CHECK (
        type IN (
            'text',
            'image'
        )
    )
);

INSERT INTO messages_new (
      id,
      chat_id,
      author_id,
      type,
      body,
      attachment,
      created_at
)
SELECT
    -- оставляем старый id
    messages.id,
    -- оставляем старый chat_id
    messages.chat_id,

-- вместо старого текстового author ищем настоящий user.id
    (
        SELECT users.id
        FROM users

        WHERE
            users.display_name = messages.author

        ORDER BY users.id ASC
        LIMIT 1
    ),
    messages.type,
    messages.body,
    messages.attachment,
    messages.created_at
FROM messages;

DROP TABLE messages;

ALTER TABLE messages_new
RENAME TO messages;

CREATE INDEX IF NOT EXISTS
idx_messages_chat_id
ON messages(chat_id);

CREATE INDEX IF NOT EXISTS
idx_messages_author_id
ON messages(author_id);
