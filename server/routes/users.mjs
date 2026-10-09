import { fail } from "../http.mjs";
export function handleUsers(req, path, reply, db, userId) {
  if (path !== "/api/users" || req.method !== "GET") return;
  const query =
    new URL(req.url, "http://localhost").searchParams
      .get("q")
      ?.trim()
      .replace(/^@/, "") ?? "";
  if (query.length > 64) fail(400, "Слишком длинный поисковый запрос.");
  if (query.length < 2) return reply([]);
  const normalized = query.toLocaleLowerCase("ru");
  // В SQLite встроенный LOWER не приводит кириллицу: нормализация выполняется явно.
  db.function("search_matches", (username, name) =>
    Number(
      username.toLowerCase().includes(normalized) ||
        name.toLocaleLowerCase("ru").includes(normalized),
    ),
  );
  return reply(
    db
      .prepare(
        `SELECT id, username, display_name, avatar_path, status, created_at
    FROM users WHERE id != ? AND search_matches(username, display_name) = 1
    ORDER BY username COLLATE NOCASE LIMIT 30`,
      )
      .all(userId),
  );
}
