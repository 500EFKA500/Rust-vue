import { randomUUID } from "node:crypto";
import { publicUser } from "../database.mjs";
import {
  hashPassword,
  verifyPassword,
  validateCredentials,
  createSession,
} from "../security.mjs";
import { fail, text, jsonBody } from "../http.mjs";
export function createAuthHandler(db) {
  const attempts = new Map();
  const dummyHashPromise = hashPassword(randomUUID());
  return async function handleAuth(req, res, path, reply) {
    if (
      ["/api/auth/register", "/api/auth/login"].includes(path) &&
      req.method === "POST"
    ) {
      const ip = req.socket.remoteAddress;
      const now = Date.now();
      for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
      const attempt = attempts.get(ip) ?? { count: 0, until: now + 15 * 60 * 1000 };
      attempt.count++;
      attempts.set(ip, attempt);
      if (attempt.count > 20) {
        res.setHeader("Retry-After", "900");
        fail(429, "Слишком много попыток. Повторите позже.");
      }
      const body = await jsonBody(req, 8192);
      const { username, password } = validateCredentials(body);
      let userId;
      if (path.endsWith("register")) {
        const name = text(body.displayName, 40, "Имя", true);
        if (db.prepare("SELECT id FROM users WHERE username = ?").get(username))
          fail(409, "Этот логин уже занят.");
        const hash = await hashPassword(password);
        try {
          userId = Number(
            db
              .prepare(
                "INSERT INTO users(username, display_name, password_hash) VALUES (?, ?, ?)",
              )
              .run(username, name, hash).lastInsertRowid,
          );
        } catch (error) {
          if (String(error).includes("UNIQUE")) fail(409, "Этот логин уже занят.");
          throw error;
        }
      } else {
        const account = db
          .prepare("SELECT id, password_hash FROM users WHERE username = ?")
          .get(username);
        const valid = await verifyPassword(
          password,
          account?.password_hash ?? (await dummyHashPromise),
        );
        if (!account || !valid) fail(401, "Неверный логин или пароль.");
        userId = account.id;
      }
      return reply({ ...createSession(db, userId), user: publicUser(db, userId) });
    }
  };
}
