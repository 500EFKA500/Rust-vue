CREATE TABLE IF NOT EXISTS user_chat_state (
    user_id INTEGER PRIMARY KEY
        REFERENCES users(id)
        ON DELETE CASCADE,

    selected_chat_id INTEGER
        REFERENCES chats(id)
        ON DELETE SET NULL
);