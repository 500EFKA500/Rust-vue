CREATE TABLE IF NOT EXISTS chat_read_state (
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    chat_id INTEGER NOT NULL
        REFERENCES chats(id)
        ON DELETE CASCADE,

    last_read_message_id INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (user_id, chat_id)
);