import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../database.mjs";
import { createApp } from "../app.mjs";

test("private dialogs, account appearance, pin/mute, deletion and access boundaries", async () => {
  const db = openDatabase(":memory:");
  const server = createApp(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  async function api(path, method = "GET", body, token = "", expected = 200) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  }
  try {
    const alice = await api("/api/auth/register", "POST", {
      username: "alice",
      displayName: "Алиса",
      password: "long-password-A1",
    });
    const bob = await api("/api/auth/register", "POST", {
      username: "bob",
      displayName: "Боб",
      password: "long-password-B2",
    });
    const charlie = await api("/api/auth/register", "POST", {
      username: "charlie",
      displayName: "Чарли",
      password: "long-password-C3",
    });
    assert.deepEqual((await api("/api/chats", "GET", undefined, alice.token)).chats, []);
    const users = await api("/api/users?q=БО", "GET", undefined, alice.token);
    assert.equal(users[0].id, bob.user.id);
    assert.equal(users[0].password_hash, undefined);
    assert.equal((await api("/api/users?q=@bob", "GET", undefined, bob.token)).length, 0);
    await api("/api/chats/direct", "POST", { userId: alice.user.id }, alice.token, 400);
    const dialog = await api(
      "/api/chats/direct",
      "POST",
      { userId: bob.user.id },
      alice.token,
      201,
    );
    assert.equal(dialog.title, "Боб");
    const again = await api(
      "/api/chats/direct",
      "POST",
      { userId: bob.user.id },
      alice.token,
      201,
    );
    assert.equal(again.id, dialog.id);
    assert.equal((await api("/api/chats", "GET", undefined, bob.token)).chats.length, 0);
    for (const [suffix, method, body] of [
      ["messages", "GET"],
      ["messages", "POST", { type: "text", body: "wrong" }],
      ["read", "POST", { lastMessageId: 0 }],
      ["select", "POST", {}],
    ]) {
      await api(`/api/chats/${dialog.id}/${suffix}`, method, body, charlie.token, 404);
    }
    await api(`/api/chats/${dialog.id}`, "PATCH", { muted: true }, charlie.token, 404);
    await api(`/api/chats/${dialog.id}`, "DELETE", undefined, charlie.token, 404);
    const sent = await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "text", body: "Привет!" },
      alice.token,
      201,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, bob.token)).chats[0].unread_count,
      1,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, bob.token)).chats[0].title,
      "Алиса",
    );
    await api(
      `/api/chats/${dialog.id}`,
      "PATCH",
      { muted: true, pinned: true },
      bob.token,
    );
    const muted = (await api("/api/chats", "GET", undefined, bob.token)).chats[0];
    assert.equal(muted.muted, 1);
    assert.ok(muted.pinned_at > 0);
    assert.equal(muted.unread_count, 1);
    const own = (await api("/api/chats", "GET", undefined, alice.token)).chats[0];
    assert.equal(own.muted, 0);
    assert.equal(own.pinned_at, 0);
    const another = await api(
      "/api/chats/direct",
      "POST",
      { userId: charlie.user.id },
      bob.token,
      201,
    );
    await api(
      `/api/chats/${another.id}/messages`,
      "POST",
      { type: "text", body: "Новее" },
      bob.token,
      201,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, bob.token)).chats[0].id,
      dialog.id,
    );
    const settings = {
      theme: "light",
      accent: "green",
      fontSize: 18,
      background: "dots",
      compact: true,
    };
    await api("/api/appearance", "PATCH", settings, bob.token);
    assert.deepEqual(
      (await api("/api/auth/me", "GET", undefined, bob.token)).appearance,
      settings,
    );
    assert.equal(
      (await api("/api/appearance", "GET", undefined, alice.token)).theme,
      "dark",
    );
    await api("/api/appearance", "PATCH", { ...settings, fontSize: 30 }, bob.token, 400);
    const login = await api("/api/auth/login", "POST", {
      username: "bob",
      password: "long-password-B2",
    });
    assert.deepEqual(login.user.appearance, settings);
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDXsAAAAASUVORK5CYII=";
    const image = await api("/api/uploads", "POST", { image: png }, alice.token, 201);
    await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "image", attachment: image.path },
      alice.token,
      201,
    );
    const getImage = (token) =>
      fetch(base + image.path, { headers: { Authorization: "Bearer " + token } });
    assert.equal((await getImage(bob.token)).status, 200);
    assert.equal((await getImage(charlie.token)).status, 404);
    await api(`/api/chats/${dialog.id}`, "DELETE", undefined, bob.token);
    assert.ok(
      !(await api("/api/chats", "GET", undefined, bob.token)).chats.some(
        (chat) => chat.id === dialog.id,
      ),
    );
    assert.equal(
      (await api(`/api/chats/${dialog.id}/messages`, "GET", undefined, bob.token)).length,
      0,
    );
    assert.equal((await getImage(bob.token)).status, 404);
    assert.equal(
      (await api(`/api/chats/${dialog.id}/messages`, "GET", undefined, alice.token))[0]
        .id,
      sent.id,
    );
    await api(
      `/api/chats/${dialog.id}/messages`,
      "POST",
      { type: "text", body: "Снова привет" },
      alice.token,
      201,
    );
    const returned = (await api("/api/chats", "GET", undefined, bob.token)).chats.find(
      (chat) => chat.id === dialog.id,
    );
    assert.equal(returned.unread_count, 1);
    assert.equal(returned.muted, 1);
    assert.equal(returned.pinned_at, 0);
    assert.equal(
      (await api(`/api/chats/${dialog.id}/messages`, "GET", undefined, bob.token)).length,
      1,
    );
    const archived = Number(
      db.prepare("INSERT INTO chats(title) VALUES ('Old shared chat')").run()
        .lastInsertRowid,
    );
    await api(`/api/chats/${archived}/messages`, "GET", undefined, alice.token, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
