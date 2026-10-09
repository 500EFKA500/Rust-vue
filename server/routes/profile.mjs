import { publicUser } from "../database.mjs";
import { fail, text, jsonBody } from "../http.mjs";
import { imageUpload } from "../uploads.mjs";
import { getAppearance } from "../appearance.mjs";
export async function handleProfile(req, res, path, reply, db, userId) {
  if (path === "/api/appearance" && req.method === "GET")
    return reply(getAppearance(db, userId));
  if (path === "/api/appearance" && req.method === "PATCH") {
    const body = await jsonBody(req, 2048);
    if (
      !["dark", "light", "system"].includes(body.theme) ||
      !["blue", "purple", "green", "orange", "pink"].includes(body.accent) ||
      !["plain", "dots", "gradient"].includes(body.background) ||
      !Number.isInteger(body.fontSize) ||
      body.fontSize < 12 ||
      body.fontSize > 20 ||
      typeof body.compact !== "boolean"
    )
      fail(400, "Некорректные настройки внешнего вида.");
    db.prepare(
      `INSERT INTO appearance_settings VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET theme = excluded.theme, accent = excluded.accent,
      font_size = excluded.font_size, background = excluded.background, compact = excluded.compact`,
    ).run(
      userId,
      body.theme,
      body.accent,
      body.fontSize,
      body.background,
      Number(body.compact),
    );
    return reply(publicUser(db, userId));
  }
  if (path === "/api/profile" && req.method === "PATCH") {
    const body = await jsonBody(req);
    const name = text(body.displayName, 40, "Имя", true);
    const status = text(body.status, 160, "О себе");
    let avatar = publicUser(db, userId).avatar_path;
    if (body.avatar === null) avatar = null;
    else if (body.avatar !== undefined)
      avatar = imageUpload(db, userId, body.avatar, 2 * 1024 * 1024);
    db.prepare(
      "UPDATE users SET display_name = ?, status = ?, avatar_path = ? WHERE id = ?",
    ).run(name, status, avatar, userId);
    return reply(publicUser(db, userId));
  }
  if (path === "/api/uploads" && req.method === "POST") {
    const body = await jsonBody(req);
    return reply(
      { path: imageUpload(db, userId, body.image, 8 * 1024 * 1024) },
      201,
    );
  }
  const upload = /^\/api\/uploads\/([a-f0-9-]{36})$/.exec(path);
  if (upload && req.method === "GET") {
    // Вложения доступны только владельцу или участнику соответствующей переписки.
    const item = db
      .prepare(
        `SELECT * FROM uploads WHERE id = ? AND (owner_id = ?
          OR '/api/uploads/' || id IN (SELECT m.attachment FROM messages m JOIN chat_members cm
            ON cm.chat_id = m.chat_id WHERE cm.user_id = ? AND m.id > cm.cleared_before_id)
          OR '/api/uploads/' || id IN (SELECT avatar_path FROM users)
          OR '/api/uploads/' || id IN (SELECT avatar_path FROM channel_chats))`,
      )
      .get(upload[1], userId, userId);
    if (!item) fail(404, "Изображение не найдено.");
    res.writeHead(200, { "Content-Type": item.mime });
    return res.end(Buffer.from(item.data));
  }
}
