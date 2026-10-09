import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../database.mjs";
import { createApp } from "../app.mjs";
import { tokenHash } from "../security.mjs";

test("registration, login, sessions, profiles and server-side message permissions", async () => {
  const db = openDatabase(":memory:");
  const server = createApp(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  async function api(path, method = "GET", body, token = "", expected = 200, origin) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  }
  try {
    await api("/api/chats", "GET", undefined, "", 401);
    await api("/api/auth/login", "POST", null, "", 400);
    await api("/api/health", "GET", undefined, "", 403, "https://malicious.example");
    await api(
      "/api/auth/register",
      "POST",
      { username: "bad", password: "123", displayName: "Test" },
      "",
      400,
    );
    const first = await api("/api/auth/register", "POST", {
      username: "alice",
      password: "long-password-A1",
      displayName: "Alice",
    });
    assert.equal(first.user.password_hash, undefined);
    const stored = db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(first.user.id);
    assert.ok(stored.password_hash.startsWith("scrypt$"));
    assert.ok(!stored.password_hash.includes("long-password-A1"));
    assert.ok(
      db.prepare("SELECT token_hash FROM sessions").get().token_hash !== first.token,
    );
    await api(
      "/api/auth/register",
      "POST",
      { username: "ALICE", password: "long-password-A1", displayName: "Duplicate" },
      "",
      409,
    );
    await api(
      "/api/auth/login",
      "POST",
      { username: "alice", password: "wrong-password-A1" },
      "",
      401,
    );
    const login = await api("/api/auth/login", "POST", {
      username: "ALICE",
      password: "long-password-A1",
    });
    assert.equal(login.user.id, first.user.id);
    const second = await api("/api/auth/register", "POST", {
      username: "bob",
      password: "long-password-B2",
      displayName: "Bob",
    });
    const dialog = await api(
      "/api/chats/direct",
      "POST",
      { userId: second.user.id },
      first.token,
      201,
    );
    const third = await api("/api/auth/register", "POST", {
      username: "charlie",
      password: "long-password-C3",
      displayName: "Charlie",
    });
    const bobOther = await api(
      "/api/chats/direct",
      "POST",
      { userId: third.user.id },
      second.token,
      201,
    );
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDXsAAAAASUVORK5CYII=";
    const profile = await api(
      "/api/profile",
      "PATCH",
      { displayName: "Алиса", status: "Привет", avatar: png },
      first.token,
    );
    assert.equal(profile.status, "Привет");
    const image = await fetch(base + profile.avatar_path, {
      headers: { Authorization: "Bearer " + second.token },
    });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal((await fetch(base + profile.avatar_path)).status, 401);
    await api("/api/profile", "PATCH", { displayName: "", status: "" }, first.token, 400);
    await api(
      "/api/uploads",
      "POST",
      { image: "data:image/png;base64,aGVsbG8=" },
      first.token,
      400,
    );
    const message = await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "text", body: "Тест", author_id: second.user.id },
      first.token,
      201,
    );
    const list = await api(
      `/api/chats/${dialog.id}/messages`,
      "GET",
      undefined,
      second.token,
    );
    assert.equal(list[0].author_id, first.user.id);
    await api(
      "/api/messages/" + message.id,
      "PATCH",
      { body: "Взлом" },
      second.token,
      404,
    );
    await api("/api/messages/" + message.id, "DELETE", undefined, second.token, 404);
    await api(
      "/api/messages/" + message.id,
      "PATCH",
      { body: "Исправлено" },
      first.token,
    );
    assert.equal(
      (await api(`/api/chats/${dialog.id}/messages`, "GET", undefined, second.token))[0]
        .body,
      "Исправлено",
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, second.token)).chats.find(
        (chat) => chat.id === dialog.id,
      ).unread_count,
      1,
    );
    await api(
      `/api/chats/${dialog.id}/read`,
      "POST",
      { lastMessageId: message.id },
      second.token,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, second.token)).chats.find(
        (chat) => chat.id === dialog.id,
      ).unread_count,
      0,
    );
    await api(`/api/chats/${dialog.id}/select`, "POST", {}, first.token);
    await api(`/api/chats/${bobOther.id}/select`, "POST", {}, second.token);
    assert.equal(
      (await api("/api/chats", "GET", undefined, first.token)).selectedChatId,
      dialog.id,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, second.token)).selectedChatId,
      bobOther.id,
    );
    const upload = await api("/api/uploads", "POST", { image: png }, first.token, 201);
    assert.equal(
      (
        await fetch(base + upload.path, {
          headers: { Authorization: "Bearer " + second.token },
        })
      ).status,
      404,
    );
    await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "image", attachment: upload.path },
      second.token,
      400,
    );
    await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "image", attachment: upload.path },
      first.token,
      201,
    );
    await api("/api/messages/" + message.id, "DELETE", undefined, first.token);
    await api("/api/auth/logout", "POST", {}, first.token);
    await api("/api/auth/me", "GET", undefined, first.token, 401);
    await api("/api/auth/me", "GET", undefined, login.token);
    db.prepare("UPDATE sessions SET expires_at = 0 WHERE token_hash = ?").run(
      tokenHash(login.token),
    );
    await api("/api/auth/me", "GET", undefined, login.token, 401);
    assert.equal(
      (await api("/api/auth/me", "GET", undefined, second.token)).username,
      "bob",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
