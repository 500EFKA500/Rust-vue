import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../database.mjs";
import { createApp } from "../app.mjs";
import { tokenHash } from "../security.mjs";

test("groups: creation, validation, members, delivery and access boundaries", async () => {
  const db = openDatabase(":memory:");
  const tokens = ["alice-test", "bob-test", "charlie-test", "outsider-test"];
  tokens.forEach((token, i) => {
    db.prepare(
      "INSERT INTO users(id, username, display_name, password_hash) VALUES (?, ?, ?, 'unused')",
    ).run(i + 1, token, token);
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").run(
      tokenHash(token),
      i + 1,
      Date.now() + 60000,
      Date.now(),
    );
  });
  const server = createApp(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  async function api(path, method = "GET", body, who = 0, expected = 200) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + tokens[who],
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  }
  try {
    for (const body of [
      { title: "", memberIds: [2] },
      { title: "Group", memberIds: [] },
      { title: "Group", memberIds: [1] },
      { title: "Group", memberIds: [2, 2] },
      { title: "Group", memberIds: ["2"] },
      { title: "Group", memberIds: Array(100).fill(2) },
    ])
      await api("/api/chats/groups", "POST", body, 0, 400);
    await api(
      "/api/chats/groups",
      "POST",
      { title: "Group", memberIds: [99] },
      0,
      404,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM chats").get().n, 0);
    const group = await api(
      "/api/chats/groups",
      "POST",
      { title: "Друзья", memberIds: [2, 3] },
      0,
      201,
    );
    assert.equal(group.kind, "group");
    assert.equal(group.title, "Друзья");
    assert.equal(group.member_count, 3);
    for (const who of [0, 1, 2]) {
      const list = (await api("/api/chats", "GET", undefined, who)).chats;
      assert.equal(list.length, 1, "No duplicate rows for group members");
      assert.equal(list[0].id, group.id);
      const members = await api(
        `/api/chats/${group.id}/members`,
        "GET",
        undefined,
        who,
      );
      assert.deepEqual(
        members.map((item) => item.id),
        [1, 2, 3],
      );
      assert.equal(members[0].is_owner, 1);
      assert.equal(members[0].password_hash, undefined);
    }
    assert.deepEqual((await api("/api/chats", "GET", undefined, 3)).chats, []);
    for (const [suffix, method, body] of [
      ["members", "GET"],
      ["messages", "GET"],
      ["messages", "POST", { type: "text", body: "Intrusion" }],
      ["read", "POST", { lastMessageId: 0 }],
      ["select", "POST", {}],
    ])
      await api(`/api/chats/${group.id}/${suffix}`, method, body, 3, 404);
    const sent = await api(
      `/api/chats/${group.id}/messages`,
      "POST",
      { type: "text", body: "Всем привет" },
      0,
      201,
    );
    for (const who of [1, 2]) {
      const messages = await api(
        `/api/chats/${group.id}/messages`,
        "GET",
        undefined,
        who,
      );
      assert.equal(messages[0].id, sent.id);
      assert.equal(
        (await api("/api/chats", "GET", undefined, who)).chats[0].unread_count,
        1,
      );
    }
    await api(
      `/api/messages/${sent.id}`,
      "PATCH",
      { body: "Другой текст" },
      1,
      404,
    );
    await api(`/api/messages/${sent.id}`, "DELETE", undefined, 2, 404);
    await api(
      `/api/chats/${group.id}/read`,
      "POST",
      { lastMessageId: sent.id },
      1,
    );
    await api(
      `/api/chats/${group.id}`,
      "PATCH",
      { muted: true, pinned: true },
      1,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, 1)).chats[0].unread_count,
      0,
    );
    assert.equal(
      (await api("/api/chats", "GET", undefined, 2)).chats[0].muted,
      0,
    );
    const direct = await api(
      "/api/chats/direct",
      "POST",
      { userId: 2 },
      0,
      201,
    );
    assert.equal(direct.kind, "direct");
    assert.equal(
      (await api("/api/chats", "GET", undefined, 0)).chats.length,
      2,
    );
    await api(`/api/chats/${group.id}`, "DELETE", undefined, 1);
    assert.equal(
      (await api(`/api/chats/${group.id}/messages`, "GET", undefined, 1))
        .length,
      0,
    );
    assert.equal(
      (await api(`/api/chats/${group.id}/messages`, "GET", undefined, 2))
        .length,
      1,
    );
    await api(
      `/api/chats/${group.id}/messages`,
      "POST",
      { type: "text", body: "Новый текст" },
      2,
      201,
    );
    const restored = (await api("/api/chats", "GET", undefined, 1)).chats.find(
      (chat) => chat.id === group.id,
    );
    assert.equal(restored.unread_count, 1);
    assert.equal(restored.muted, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("existing database migration keeps memberships, history and selected chat", () => {
  const dir = mkdtempSync(join(tmpdir(), "desire-group-migration-"));
  const file = join(dir, "test.db");
  let db;
  try {
    db = openDatabase(file);
    db.exec(`INSERT INTO users VALUES (1, 'one', 'One', 'unused', NULL, '', CURRENT_TIMESTAMP), (2, 'two', 'Two', 'unused', NULL, '', CURRENT_TIMESTAMP);
      INSERT INTO chats VALUES (1, '', ''); INSERT INTO direct_chats VALUES (1, 1, 2);
      INSERT INTO messages(chat_id, author_id, type, body) VALUES (1, 1, 'text', 'Keep me');
      INSERT INTO user_chat_state VALUES (1, 1);
      DROP TABLE chat_members;
      CREATE TABLE chat_members (
        chat_id INTEGER NOT NULL REFERENCES direct_chats(chat_id), user_id INTEGER NOT NULL REFERENCES users(id),
        muted INTEGER NOT NULL DEFAULT 0, pinned_at INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0, cleared_before_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(chat_id, user_id));
      INSERT INTO chat_members VALUES (1, 1, 1, 123, 0, 0), (1, 2, 0, 0, 1, 1);`);
    const before = db
      .prepare("SELECT * FROM chat_members ORDER BY user_id")
      .all();
    db.close();
    db = openDatabase(file);
    assert.deepEqual(
      db.prepare("SELECT * FROM chat_members ORDER BY user_id").all(),
      before,
    );
    assert.equal(db.prepare("SELECT body FROM messages").get().body, "Keep me");
    assert.equal(
      db.prepare("SELECT selected_chat_id FROM user_chat_state").get()
        .selected_chat_id,
      1,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.ok(
      db
        .prepare("PRAGMA foreign_key_list(chat_members)")
        .all()
        .some((key) => key.table === "chats"),
    );
    db.close();
    db = openDatabase(file);
    assert.deepEqual(
      db.prepare("SELECT * FROM chat_members ORDER BY user_id").all(),
      before,
      "Migration is idempotent",
    );
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
