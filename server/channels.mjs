import { fail, text } from "./http.mjs";

export function requireChannel(db, chatId) {
  const channel = db
    .prepare("SELECT * FROM channel_chats WHERE chat_id = ?")
    .get(chatId);
  if (!channel) fail(404, "Канал не найден.");
  return channel;
}
export function requirePublisher(db, chatId, userId) {
  const channel = db
    .prepare("SELECT owner_id FROM channel_chats WHERE chat_id = ?")
    .get(chatId);
  if (channel && channel.owner_id !== userId)
    fail(403, "Публиковать посты может только владелец канала.");
}
export function channelInfo(db, chatId, userId) {
  return db
    .prepare(
      `SELECT h.chat_id AS id, c.title, c.subtitle AS description,
    h.username, h.avatar_path, h.comments_enabled, h.owner_id,
    (SELECT COUNT(*) FROM chat_members WHERE chat_id = h.chat_id) AS subscriber_count,
    EXISTS(SELECT 1 FROM chat_members WHERE chat_id = h.chat_id AND user_id = ?) AS subscribed,
    CASE WHEN h.owner_id = ? THEN 1 ELSE 0 END AS can_post
    FROM channel_chats h JOIN chats c ON c.id = h.chat_id WHERE h.chat_id = ?`,
    )
    .get(userId, userId, chatId);
}
export function channelFields(body) {
  const title = text(body.title, 80, "Название канала", true);
  const description = text(body.description ?? "", 500, "Описание");
  const username = text(body.username, 33, "Адрес канала", true)
    .replace(/^@/, "")
    .toLowerCase();
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(username))
    fail(
      400,
      "Адрес: 5–32 латинских символа, цифры или _, начинается с буквы.",
    );
  if (typeof body.commentsEnabled !== "boolean")
    fail(400, "Некорректная настройка комментариев.");
  return {
    title,
    description,
    username,
    commentsEnabled: Number(body.commentsEnabled),
  };
}
