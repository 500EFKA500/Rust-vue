import { randomUUID } from "node:crypto";
import { fail } from "./http.mjs";

export function imageUpload(db, userId, value, maxSize) {
  if (typeof value !== "string") fail(400, "Выберите изображение.");
  const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    value,
  );
  if (!match) fail(400, "Поддерживаются PNG, JPEG, WebP и GIF.");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > maxSize) fail(413, "Изображение слишком большое.");
  const mime = match[1];
  const valid =
    mime === "image/png"
      ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? data[0] === 255 && data[1] === 216 && data[2] === 255
        : mime === "image/gif"
          ? ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString())
          : data.subarray(0, 4).toString() === "RIFF" &&
            data.subarray(8, 12).toString() === "WEBP";
  if (!valid) fail(400, "Содержимое файла не соответствует формату изображения.");
  const used = db
    .prepare(
      "SELECT COALESCE(SUM(length(data)), 0) AS size FROM uploads WHERE owner_id = ?",
    )
    .get(userId).size;
  if (used + data.length > 64 * 1024 * 1024)
    fail(413, "Исчерпана квота вложений аккаунта (64 МБ).");
  const id = randomUUID();
  db.prepare("INSERT INTO uploads VALUES (?, ?, ?, ?)").run(id, userId, mime, data);
  return `/api/uploads/${id}`;
}
