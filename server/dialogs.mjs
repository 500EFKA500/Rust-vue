import { fail, text } from "./http.mjs";

export function requireMembership(db, chatId, userId) {
  const member = db
    .prepare("SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, userId);
  if (!member) fail(404, "Диалог не найден.");
  return member;
}

export function chatList(db, userId) {
  return db
    .prepare(
      `
    SELECT c.id, CASE WHEN h.chat_id IS NOT NULL THEN 'channel' WHEN g.chat_id IS NOT NULL THEN 'group' ELSE 'direct' END AS kind,
      COALESCE(u.id, c.id) AS peer_id, COALESCE(h.username, u.username, '') AS peer_username,
      CASE WHEN d.chat_id IS NOT NULL THEN u.display_name ELSE c.title END AS title,
      CASE WHEN d.chat_id IS NOT NULL THEN u.status ELSE c.subtitle END AS subtitle,
      COALESCE(h.avatar_path, u.avatar_path) AS avatar_path,
      CASE WHEN h.chat_id IS NULL OR h.owner_id = cm.user_id THEN 1 ELSE 0 END AS can_post,
      COALESCE(h.comments_enabled, 0) AS comments_enabled, h.owner_id AS owner_id,
      (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) AS member_count,
      cm.muted, cm.pinned_at,
      (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.author_id != ?
        AND m.id > MAX(cm.cleared_before_id, COALESCE(r.last_read_message_id, 0))) AS unread_count,
      (SELECT CASE WHEN type = 'image' THEN 'Изображение' ELSE body END FROM messages
        WHERE chat_id = c.id AND id > cm.cleared_before_id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages WHERE chat_id = c.id AND id > cm.cleared_before_id ORDER BY id DESC LIMIT 1) AS last_message_at,
      COALESCE((SELECT MAX(id) FROM messages WHERE chat_id = c.id AND id > cm.cleared_before_id), 0) AS last_message_id
    FROM chat_members cm JOIN chats c ON c.id = cm.chat_id
    LEFT JOIN direct_chats d ON d.chat_id = c.id
    LEFT JOIN group_chats g ON g.chat_id = c.id
    LEFT JOIN channel_chats h ON h.chat_id = c.id
    LEFT JOIN users u ON u.id = CASE WHEN d.low_user_id = cm.user_id THEN d.high_user_id ELSE d.low_user_id END
    LEFT JOIN chat_read_state r ON r.user_id = cm.user_id AND r.chat_id = c.id
    WHERE cm.user_id = ? AND cm.hidden = 0 AND (d.chat_id IS NOT NULL OR g.chat_id IS NOT NULL OR h.chat_id IS NOT NULL)
    ORDER BY (cm.pinned_at > 0) DESC, cm.pinned_at DESC, last_message_id DESC, c.id DESC
  `,
    )
    .all(userId, userId);
}

export function createGroup(db, userId, body) {
  const title = text(body.title, 80, "Название группы", true);
  const ids = body.memberIds;
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 99 ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0 || id === userId) ||
    new Set(ids).size !== ids.length
  )
    fail(400, "Выберите от 1 до 99 других участников.");
  const exists = db.prepare("SELECT id FROM users WHERE id = ?");
  if (ids.some((id) => !exists.get(id)))
    fail(404, "Один из пользователей не найден.");
  db.exec("BEGIN IMMEDIATE");
  try {
    const chatId = Number(
      db.prepare("INSERT INTO chats(title) VALUES (?)").run(title)
        .lastInsertRowid,
    );
    db.prepare("INSERT INTO group_chats(chat_id, owner_id) VALUES (?, ?)").run(
      chatId,
      userId,
    );
    const insert = db.prepare(
      "INSERT INTO chat_members(chat_id, user_id) VALUES (?, ?)",
    );
    for (const id of [userId, ...ids]) insert.run(chatId, id);
    db.exec("COMMIT");
    return chatList(db, userId).find((chat) => chat.id === chatId);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function openDirectChat(db, userId, peerId) {
  if (!Number.isSafeInteger(peerId) || peerId <= 0 || peerId === userId)
    fail(400, "Выберите другого пользователя.");
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(peerId))
    fail(404, "Пользователь не найден.");
  const low = Math.min(userId, peerId),
    high = Math.max(userId, peerId);
  db.exec("BEGIN IMMEDIATE");
  try {
    let direct = db
      .prepare(
        "SELECT chat_id FROM direct_chats WHERE low_user_id = ? AND high_user_id = ?",
      )
      .get(low, high);
    if (!direct) {
      const id = Number(
        db.prepare("INSERT INTO chats(title) VALUES ('')").run()
          .lastInsertRowid,
      );
      db.prepare("INSERT INTO direct_chats VALUES (?, ?, ?)").run(
        id,
        low,
        high,
      );
      db.prepare(
        "INSERT INTO chat_members(chat_id, user_id, hidden) VALUES (?, ?, 0), (?, ?, 1)",
      ).run(id, userId, id, peerId);
      direct = { chat_id: id };
    }
    db.prepare(
      "UPDATE chat_members SET hidden = 0 WHERE chat_id = ? AND user_id = ?",
    ).run(direct.chat_id, userId);
    db.exec("COMMIT");
    return chatList(db, userId).find((chat) => chat.id === direct.chat_id);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
