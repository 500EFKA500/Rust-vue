import { fail, text, jsonBody } from "../http.mjs";
import { requirePublisher } from "../channels.mjs";
import {
  chatList,
  openDirectChat,
  createGroup,
  requireMembership,
} from "../dialogs.mjs";
export async function handleChats(req, res, path, reply, db, userId) {
  if (path === "/api/chats/groups" && req.method === "POST") {
    return reply(createGroup(db, userId, await jsonBody(req, 4096)), 201);
  }
  const membersRoute = /^\/api\/chats\/(\d+)\/members$/.exec(path);
  if (membersRoute && req.method === "GET") {
    const chatId = Number(membersRoute[1]);
    requireMembership(db, chatId, userId);
    // Подписчикам не выдаём полный список пользователей канала.
    requirePublisher(db, chatId, userId);
    return reply(
      db
        .prepare(
          `SELECT u.id, u.username, u.display_name, u.avatar_path,
      CASE WHEN COALESCE(h.owner_id, g.owner_id) = u.id THEN 1 ELSE 0 END AS is_owner
      FROM chat_members cm JOIN users u ON u.id = cm.user_id
      LEFT JOIN group_chats g ON g.chat_id = cm.chat_id
      LEFT JOIN channel_chats h ON h.chat_id = cm.chat_id
      WHERE cm.chat_id = ? ORDER BY is_owner DESC, u.display_name, u.id`,
        )
        .all(chatId),
    );
  }
  if (path === "/api/chats/direct" && req.method === "POST") {
    const body = await jsonBody(req, 1024);
    return reply(openDirectChat(db, userId, body.userId), 201);
  }
  if (path === "/api/chats" && req.method === "GET") {
    const chats = chatList(db, userId);
    const state = db
      .prepare("SELECT selected_chat_id FROM user_chat_state WHERE user_id = ?")
      .get(userId);
    return reply({ chats, selectedChatId: state?.selected_chat_id ?? null });
  }
  const memberRoute = /^\/api\/chats\/(\d+)$/.exec(path);
  if (memberRoute && ["PATCH", "DELETE"].includes(req.method)) {
    const chatId = Number(memberRoute[1]);
    requireMembership(db, chatId, userId);
    if (req.method === "PATCH") {
      const body = await jsonBody(req, 1024);
      if (
        Object.keys(body).some((key) => !["muted", "pinned"].includes(key)) ||
        (body.muted !== undefined && typeof body.muted !== "boolean") ||
        (body.pinned !== undefined && typeof body.pinned !== "boolean")
      )
        fail(400, "Некорректные настройки чата.");
      if (body.muted !== undefined)
        db.prepare(
          "UPDATE chat_members SET muted = ? WHERE chat_id = ? AND user_id = ?",
        ).run(Number(body.muted), chatId, userId);
      if (body.pinned !== undefined)
        db.prepare(
          "UPDATE chat_members SET pinned_at = ? WHERE chat_id = ? AND user_id = ?",
        ).run(body.pinned ? Date.now() : 0, chatId, userId);
    } else {
      const maxId = db
        .prepare(
          "SELECT COALESCE(MAX(id), 0) AS id FROM messages WHERE chat_id = ?",
        )
        .get(chatId).id;
      db.prepare(
        "UPDATE chat_members SET hidden = 1, pinned_at = 0, cleared_before_id = ? WHERE chat_id = ? AND user_id = ?",
      ).run(maxId, chatId, userId);
      db.prepare(
        "UPDATE user_chat_state SET selected_chat_id = NULL WHERE user_id = ? AND selected_chat_id = ?",
      ).run(userId, chatId);
    }
    return reply({ ok: true });
  }
  const chatRoute = /^\/api\/chats\/(\d+)\/(messages|read|select)$/.exec(path);
  if (chatRoute) {
    const chatId = Number(chatRoute[1]);
    const action = chatRoute[2];
    const member = requireMembership(db, chatId, userId);
    if (action === "messages" && req.method === "GET") {
      return reply(
        db
          .prepare(
            `SELECT m.*, CASE WHEN h.chat_id IS NULL THEN u.display_name ELSE c.title END AS author_name,
            CASE WHEN h.chat_id IS NULL THEN u.avatar_path ELSE h.avatar_path END AS author_avatar,
            (SELECT COUNT(*) FROM channel_comments WHERE post_id = m.id) AS comment_count,
            (SELECT COUNT(*) FROM channel_views WHERE post_id = m.id) AS view_count
            FROM (SELECT * FROM messages WHERE chat_id = ? AND id > ? ORDER BY id DESC LIMIT 500) m
            JOIN users u ON u.id = m.author_id JOIN chats c ON c.id = m.chat_id
            LEFT JOIN channel_chats h ON h.chat_id = m.chat_id ORDER BY m.id`,
          )
          .all(chatId, member.cleared_before_id),
      );
    }
    if (action === "messages" && req.method === "POST") {
      requirePublisher(db, chatId, userId);
      const body = await jsonBody(req, 16384);
      let message = null,
        attachment = null;
      if (body.type === "text")
        message = text(body.body, 4096, "Сообщение", true);
      else if (body.type === "image") {
        attachment = text(body.attachment, 200, "Изображение", true);
        const builtIn =
          /^\/media\/(stickers\/cat-[0-5]\.svg|gifs\/(reaction-[0-2]|commons-[0-9]+)\.gif)$/.test(
            attachment,
          );
        const ownUpload = db
          .prepare(
            "SELECT id FROM uploads WHERE '/api/uploads/' || id = ? AND owner_id = ?",
          )
          .get(attachment, userId);
        if (!builtIn && !ownUpload)
          fail(400, "Прикрепите доступное изображение.");
      } else fail(400, "Неизвестный тип сообщения.");
      const result = db
        .prepare(
          "INSERT INTO messages(id, chat_id, author_id, type, body, attachment) VALUES ((SELECT last_id + 1 FROM message_sequence WHERE singleton = 1), ?, ?, ?, ?, ?)",
        )
        .run(chatId, userId, body.type, message, attachment);
      // Новый входящий текст возвращает удалённый диалог в список получателя.
      db.prepare("UPDATE chat_members SET hidden = 0 WHERE chat_id = ?").run(
        chatId,
      );
      return reply({ id: Number(result.lastInsertRowid) }, 201);
    }
    if (action === "select" && req.method === "POST") {
      db.prepare(
        `INSERT INTO user_chat_state VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET selected_chat_id = excluded.selected_chat_id`,
      ).run(userId, chatId);
      return reply({ ok: true });
    }
    if (action === "read" && req.method === "POST") {
      const body = await jsonBody(req, 1024);
      const id = Number(body.lastMessageId);
      if (!Number.isSafeInteger(id) || id < 0)
        fail(400, "Некорректное сообщение.");
      const max = db
        .prepare(
          "SELECT COALESCE(MAX(id), 0) AS id FROM messages WHERE chat_id = ?",
        )
        .get(chatId).id;
      if (
        db
          .prepare("SELECT chat_id FROM channel_chats WHERE chat_id = ?")
          .get(chatId)
      ) {
        db.prepare(
          `INSERT OR IGNORE INTO channel_views(post_id, user_id)
          SELECT id, ? FROM (SELECT id FROM messages WHERE chat_id = ? AND id > ? AND id <= ? ORDER BY id DESC LIMIT 500)`,
        ).run(userId, chatId, member.cleared_before_id, Math.min(id, max));
      }
      db.prepare(
        `INSERT INTO chat_read_state VALUES (?, ?, ?) ON CONFLICT(user_id, chat_id)
            DO UPDATE SET last_read_message_id = MAX(last_read_message_id, excluded.last_read_message_id)`,
      ).run(userId, chatId, Math.min(id, max));
      return reply({ ok: true });
    }
  }
  const messageRoute = /^\/api\/messages\/(\d+)$/.exec(path);
  if (messageRoute && ["PATCH", "DELETE"].includes(req.method)) {
    const message = db
      .prepare("SELECT * FROM messages WHERE id = ? AND author_id = ?")
      .get(Number(messageRoute[1]), userId);
    if (!message)
      fail(404, "Сообщение не найдено или принадлежит другому пользователю.");
    requireMembership(db, message.chat_id, userId);
    requirePublisher(db, message.chat_id, userId);
    if (req.method === "DELETE")
      db.prepare("DELETE FROM messages WHERE id = ? AND author_id = ?").run(
        message.id,
        userId,
      );
    else {
      if (message.type !== "text")
        fail(400, "Можно редактировать только текст.");
      const body = await jsonBody(req, 16384);
      db.prepare(
        "UPDATE messages SET body = ? WHERE id = ? AND author_id = ?",
      ).run(text(body.body, 4096, "Сообщение", true), message.id, userId);
    }
    return reply({ ok: true });
  }
}
