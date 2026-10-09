import { createServer } from "node:http";
import { publicUser } from "./database.mjs";
import { tokenHash } from "./security.mjs";
import { fail } from "./http.mjs";
import { createAuthHandler } from "./routes/auth.mjs";
import { handleProfile } from "./routes/profile.mjs";
import { handleChats } from "./routes/chats.mjs";
import { handleChannels } from "./routes/channels.mjs";
import { handleUsers } from "./routes/users.mjs";

export function createApp(
  db,
  {
    origins = [
      "http://localhost:1420",
      "http://127.0.0.1:1420",
      "http://tauri.localhost",
      "https://tauri.localhost",
      "tauri://localhost",
    ],
  } = {},
) {
  const handleAuth = createAuthHandler(db);
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    const origin = req.headers.origin;
    const reply = (value, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      if (origin && !origins.includes(origin))
        fail(403, "Этот клиент не разрешён сервером.");
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        });
        return res.end();
      }
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/api/health" && req.method === "GET")
        return reply({ ok: true });
      await handleAuth(req, res, path, reply);
      if (res.writableEnded) return;
      const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      const hash = tokenHash(token);
      const session = db
        .prepare(
          "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",
        )
        .get(hash, Date.now());
      if (!session) fail(401, "Сессия завершена. Войдите снова.");
      const userId = session.user_id;
      handleUsers(req, path, reply, db, userId);
      if (res.writableEnded) return;
      if (path === "/api/auth/me" && req.method === "GET")
        return reply(publicUser(db, userId));
      if (path === "/api/auth/logout" && req.method === "POST") {
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash);
        return reply({ ok: true });
      }
      await handleProfile(req, res, path, reply, db, userId);
      if (res.writableEnded) return;
      await handleChats(req, res, path, reply, db, userId);
      if (res.writableEnded) return;
      await handleChannels(req, res, path, reply, db, userId);
      if (res.writableEnded) return;
      fail(404, "Запрос не найден.");
    } catch (error) {
      if (!error.status) console.error("Server error:", error.message);
      if (!res.headersSent)
        reply(
          { error: error.status ? error.message : "Ошибка сервера." },
          error.status ?? 500,
        );
      else res.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  return server;
}
