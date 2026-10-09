import { fail, text, jsonBody } from "../http.mjs";
import { chatList, requireMembership } from "../dialogs.mjs";
import { channelInfo, channelFields, requireChannel } from "../channels.mjs";
import { imageUpload } from "../uploads.mjs";

export async function handleChannels(req, res, path, reply, db, userId) {
  if (path === "/api/channels" && req.method === "GET") {
    const query =
      new URL(req.url, "http://localhost").searchParams
        .get("q")
        ?.trim()
        .replace(/^@/, "") ?? "";
    if (query.length < 2) return reply([]);
    if (query.length > 64) fail(400, "Поисковый запрос слишком длинный.");
    const ids = db
      .prepare(
        `SELECT h.chat_id, h.username, c.title FROM channel_chats h JOIN chats c ON c.id = h.chat_id ORDER BY c.title, h.chat_id`,
      )
      .all();
    const lower = query.toLocaleLowerCase("ru");
    return reply(
      ids
        .filter(
          (item) =>
            item.username.includes(lower) ||
            item.title.toLocaleLowerCase("ru").includes(lower),
        )
        .slice(0, 30)
        .map((item) => channelInfo(db, item.chat_id, userId)),
    );
  }
  if (path === "/api/channels" && req.method === "POST") {
    const body = await jsonBody(req);
    const fields = channelFields(body);
    if (
      db
        .prepare("SELECT chat_id FROM channel_chats WHERE username = ?")
        .get(fields.username)
    )
      fail(409, "Этот адрес канала уже занят.");
    db.exec("BEGIN IMMEDIATE");
    try {
      const id = Number(
        db
          .prepare("INSERT INTO chats(title, subtitle) VALUES (?, ?)")
          .run(fields.title, fields.description).lastInsertRowid,
      );
      const avatar =
        body.avatar == null
          ? null
          : imageUpload(db, userId, body.avatar, 2 * 1024 * 1024);
      db.prepare(
        "INSERT INTO channel_chats(chat_id, owner_id, username, avatar_path, comments_enabled) VALUES (?, ?, ?, ?, ?)",
      ).run(id, userId, fields.username, avatar, fields.commentsEnabled);
      db.prepare(
        "INSERT INTO chat_members(chat_id, user_id) VALUES (?, ?)",
      ).run(id, userId);
      db.exec("COMMIT");
      return reply(
        chatList(db, userId).find((chat) => chat.id === id),
        201,
      );
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const channelRoute = /^\/api\/channels\/(\d+)(?:\/(subscription))?$/.exec(
    path,
  );
  if (channelRoute) {
    const id = Number(channelRoute[1]);
    const channel = requireChannel(db, id);
    if (!channelRoute[2] && req.method === "GET")
      return reply(channelInfo(db, id, userId));
    if (!channelRoute[2] && req.method === "PATCH") {
      if (channel.owner_id !== userId)
        fail(403, "Настройки доступны только владельцу канала.");
      const body = await jsonBody(req);
      const fields = channelFields(body);
      if (
        db
          .prepare(
            "SELECT chat_id FROM channel_chats WHERE username = ? AND chat_id != ?",
          )
          .get(fields.username, id)
      )
        fail(409, "Этот адрес канала уже занят.");
      db.exec("BEGIN IMMEDIATE");
      try {
        let avatar = channel.avatar_path;
        if (body.avatar === null) avatar = null;
        else if (body.avatar !== undefined)
          avatar = imageUpload(db, userId, body.avatar, 2 * 1024 * 1024);
        db.prepare("UPDATE chats SET title = ?, subtitle = ? WHERE id = ?").run(
          fields.title,
          fields.description,
          id,
        );
        db.prepare(
          "UPDATE channel_chats SET username = ?, avatar_path = ?, comments_enabled = ? WHERE chat_id = ?",
        ).run(fields.username, avatar, fields.commentsEnabled, id);
        db.exec("COMMIT");
        return reply(channelInfo(db, id, userId));
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    if (channelRoute[2] && req.method === "POST") {
      db.prepare(
        `INSERT INTO chat_members(chat_id, user_id) VALUES (?, ?)
        ON CONFLICT(chat_id, user_id) DO UPDATE SET hidden = 0, cleared_before_id = 0`,
      ).run(id, userId);
      return reply(chatList(db, userId).find((chat) => chat.id === id));
    }
    if (channelRoute[2] && req.method === "DELETE") {
      if (channel.owner_id === userId)
        fail(400, "Владелец не может отписаться от собственного канала.");
      db.prepare(
        "DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?",
      ).run(id, userId);
      db.prepare(
        "UPDATE user_chat_state SET selected_chat_id = NULL WHERE user_id = ? AND selected_chat_id = ?",
      ).run(userId, id);
      return reply({ ok: true });
    }
  }
  const commentsRoute = /^\/api\/posts\/(\d+)\/comments$/.exec(path);
  if (commentsRoute && ["GET", "POST"].includes(req.method)) {
    const post = db
      .prepare(
        `SELECT m.id, m.chat_id, h.comments_enabled FROM messages m
      JOIN channel_chats h ON h.chat_id = m.chat_id WHERE m.id = ?`,
      )
      .get(Number(commentsRoute[1]));
    if (!post) fail(404, "Пост не найден.");
    const member = requireMembership(db, post.chat_id, userId);
    if (post.id <= member.cleared_before_id) fail(404, "Пост не найден.");
    if (req.method === "GET")
      return reply({
        enabled: Boolean(post.comments_enabled),
        comments: db
          .prepare(
            `SELECT cc.*, u.display_name AS author_name, u.avatar_path AS author_avatar
      FROM (SELECT * FROM channel_comments WHERE post_id = ? ORDER BY id DESC LIMIT 500) cc
      JOIN users u ON u.id = cc.author_id ORDER BY cc.id`,
          )
          .all(post.id),
      });
    if (!post.comments_enabled)
      fail(403, "Комментарии отключены владельцем канала.");
    const body = await jsonBody(req, 16384);
    const result = db
      .prepare(
        "INSERT INTO channel_comments(post_id, author_id, body) VALUES (?, ?, ?)",
      )
      .run(post.id, userId, text(body.body, 4096, "Комментарий", true));
    return reply({ id: Number(result.lastInsertRowid) }, 201);
  }
  const commentRoute = /^\/api\/comments\/(\d+)$/.exec(path);
  if (commentRoute && ["PATCH", "DELETE"].includes(req.method)) {
    const comment = db
      .prepare(
        `SELECT cc.*, m.chat_id, h.owner_id, h.comments_enabled FROM channel_comments cc
      JOIN messages m ON m.id = cc.post_id JOIN channel_chats h ON h.chat_id = m.chat_id WHERE cc.id = ?`,
      )
      .get(Number(commentRoute[1]));
    if (!comment) fail(404, "Комментарий не найден.");
    const member = requireMembership(db, comment.chat_id, userId);
    if (comment.post_id <= member.cleared_before_id)
      fail(404, "Комментарий не найден.");
    if (req.method === "PATCH") {
      if (comment.author_id !== userId)
        fail(403, "Можно изменять только свои комментарии.");
      if (!comment.comments_enabled)
        fail(403, "Комментарии отключены владельцем канала.");
      const body = await jsonBody(req, 16384);
      db.prepare("UPDATE channel_comments SET body = ? WHERE id = ?").run(
        text(body.body, 4096, "Комментарий", true),
        comment.id,
      );
    } else {
      if (comment.author_id !== userId && comment.owner_id !== userId)
        fail(403, "Этот комментарий нельзя удалить.");
      db.prepare("DELETE FROM channel_comments WHERE id = ?").run(comment.id);
    }
    return reply({ ok: true });
  }
}
