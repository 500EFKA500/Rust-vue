import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAppearance } from "./appearance.mjs";

export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
  );
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  // Старые базы связывали участников только с direct_chats. Данные не удаляем:
  // переносим все поля в таблицу с общей ссылкой на chats, в одной транзакции.
  if (
    db
      .prepare("PRAGMA foreign_key_list(chat_members)")
      .all()
      .some((key) => key.table === "direct_chats")
  ) {
    db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE chat_members RENAME TO chat_members_legacy;
      CREATE TABLE chat_members (
        chat_id INTEGER NOT NULL REFERENCES chats(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        muted INTEGER NOT NULL DEFAULT 0 CHECK(muted IN (0, 1)),
        pinned_at INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0, 1)),
        cleared_before_id INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(chat_id, user_id)
      );
      INSERT INTO chat_members SELECT * FROM chat_members_legacy;
      DROP TABLE chat_members_legacy;
      CREATE INDEX member_user ON chat_members(user_id, hidden);
      COMMIT;`);
  }
  return db;
}

export function publicUser(db, id) {
  const user = db
    .prepare(
      `SELECT id, username, display_name, avatar_path, status, created_at
    FROM users WHERE id = ?`,
    )
    .get(id);
  return user ? { ...user, appearance: getAppearance(db, id) } : undefined;
}
