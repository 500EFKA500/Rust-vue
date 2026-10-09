import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let hashing = 0;

// Ограничиваем одновременные дорогие вычисления, чтобы не исчерпать память.
async function passwordKey(password, salt) {
  if (hashing >= 2)
    throw Object.assign(new Error("Сервер занят. Попробуйте через несколько секунд."), {
      status: 503,
    });
  hashing++;
  try {
    return await derive(password, salt, 64, options);
  } finally {
    hashing--;
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await passwordKey(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [, salt, digest] = stored.split("$");
  const key = await passwordKey(password, salt);
  return timingSafeEqual(key, Buffer.from(digest, "hex"));
}

export const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

export function createSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  // Не допускаем бесконечного накопления сессий одного аккаунта.
  db.prepare(
    `DELETE FROM sessions WHERE token_hash IN (
    SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 19
  )`,
  ).run(userId);
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").run(
    tokenHash(token),
    userId,
    expiresAt,
    now,
  );
  return { token, expiresAt };
}

export function validateCredentials(body) {
  if (typeof body.username !== "string" || !/^[a-zA-Z0-9_]{3,32}$/.test(body.username))
    throw Object.assign(
      new Error("Логин: 3–32 латинские буквы, цифры или подчёркивание."),
      { status: 400 },
    );
  if (
    typeof body.password !== "string" ||
    body.password.length < 12 ||
    body.password.length > 128
  )
    throw Object.assign(new Error("Пароль должен содержать от 12 до 128 символов."), {
      status: 400,
    });
  return { username: body.username.toLowerCase(), password: body.password };
}
