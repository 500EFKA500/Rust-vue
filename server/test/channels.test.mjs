import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../database.mjs";
import { createApp } from "../app.mjs";
import { tokenHash } from "../security.mjs";

test("channels: publishing permissions, subscriptions, comments, moderation and views", async () => {
  const db = openDatabase(":memory:");
  const tokens = ["owner-test", "reader-test", "outsider-test"];
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
  const settings = {
    title: "Новости DesireMes",
    username: "@desire_news",
    description: "Наши новости",
    commentsEnabled: true,
  };
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDXsAAAAASUVORK5CYII=";
  try {
    await api(
      "/api/channels",
      "POST",
      { ...settings, username: "bad" },
      0,
      400,
    );
    await api(
      "/api/channels",
      "POST",
      { ...settings, commentsEnabled: "yes" },
      0,
      400,
    );
    const channel = await api(
      "/api/channels",
      "POST",
      { ...settings, avatar: png },
      0,
      201,
    );
    assert.equal(channel.kind, "channel");
    assert.equal(channel.can_post, 1);
    assert.equal(channel.member_count, 1);
    await api(
      "/api/channels",
      "POST",
      { ...settings, username: "DESIRE_NEWS" },
      1,
      409,
    );
    const search = await api(
      "/api/channels?q=@DESIRE_news",
      "GET",
      undefined,
      1,
    );
    assert.equal(search.length, 1);
    assert.equal(search[0].id, channel.id);
    assert.equal(search[0].subscribed, 0);
    assert.equal(
      (await api("/api/channels?q=НОВОСТИ", "GET", undefined, 1)).length,
      1,
    );
    assert.deepEqual((await api("/api/chats", "GET", undefined, 1)).chats, []);
    const subscriber = await api(
      `/api/channels/${channel.id}/subscription`,
      "POST",
      {},
      1,
    );
    assert.equal(subscriber.can_post, 0);
    assert.equal(subscriber.member_count, 2);
    await api(`/api/chats/${channel.id}/members`, "GET", undefined, 1, 403);
    assert.equal(
      (await api(`/api/chats/${channel.id}/members`, "GET", undefined, 0))[0]
        .is_owner,
      1,
    );
    await api(`/api/channels/${channel.id}/subscription`, "POST", {}, 1);
    assert.equal(
      (await api(`/api/channels/${channel.id}`, "GET", undefined, 0))
        .subscriber_count,
      2,
    );
    await api(
      `/api/chats/${channel.id}/messages`,
      "POST",
      { type: "text", body: "Intrusion" },
      1,
      403,
    );
    await api(`/api/chats/${channel.id}/messages`, "GET", undefined, 2, 404);
    await api(`/api/channels/${channel.id}`, "PATCH", settings, 1, 403);
    const post = await api(
      `/api/chats/${channel.id}/messages`,
      "POST",
      { type: "text", body: "Первый пост" },
      0,
      201,
    );
    const loaded = await api(
      `/api/chats/${channel.id}/messages`,
      "GET",
      undefined,
      1,
    );
    assert.equal(loaded[0].author_name, settings.title);
    assert.equal(loaded[0].comment_count, 0);
    assert.equal(
      (await api("/api/chats", "GET", undefined, 1)).chats[0].unread_count,
      1,
    );
    await api(
      `/api/chats/${channel.id}/read`,
      "POST",
      { lastMessageId: post.id },
      1,
    );
    await api(
      `/api/chats/${channel.id}/read`,
      "POST",
      { lastMessageId: post.id },
      1,
    );
    assert.equal(
      (await api(`/api/chats/${channel.id}/messages`, "GET", undefined, 0))[0]
        .view_count,
      1,
    );
    await api(`/api/posts/${post.id}/comments`, "GET", undefined, 2, 404);
    await api(
      `/api/posts/${post.id}/comments`,
      "POST",
      { body: "Intrusion" },
      2,
      404,
    );
    const comment = await api(
      `/api/posts/${post.id}/comments`,
      "POST",
      { body: "Читатель комментирует" },
      1,
      201,
    );
    await api(`/api/posts/${post.id}/comments`, "POST", { body: " " }, 1, 400);
    assert.equal(
      (await api(`/api/chats/${channel.id}/messages`, "GET", undefined, 0))[0]
        .comment_count,
      1,
    );
    await api(
      `/api/comments/${comment.id}`,
      "PATCH",
      { body: "Владелец правит чужой текст" },
      0,
      403,
    );
    await api(
      `/api/comments/${comment.id}`,
      "PATCH",
      { body: "Исправленный комментарий" },
      1,
    );
    assert.equal(
      (await api(`/api/posts/${post.id}/comments`, "GET", undefined, 0))
        .comments[0].body,
      "Исправленный комментарий",
    );
    await api(`/api/channels/${channel.id}/subscription`, "POST", {}, 2);
    await api(`/api/comments/${comment.id}`, "DELETE", undefined, 2, 403);
    await api(
      `/api/messages/${post.id}`,
      "PATCH",
      { body: "Читатель правит пост" },
      1,
      404,
    );
    await api(
      `/api/messages/${post.id}`,
      "PATCH",
      { body: "Обновлённый пост" },
      0,
    );
    await api(
      `/api/channels/${channel.id}`,
      "PATCH",
      { ...settings, commentsEnabled: false },
      0,
    );
    assert.equal(
      (await api(`/api/posts/${post.id}/comments`, "GET", undefined, 1))
        .enabled,
      false,
    );
    await api(
      `/api/posts/${post.id}/comments`,
      "POST",
      { body: "Disabled" },
      1,
      403,
    );
    await api(
      `/api/comments/${comment.id}`,
      "PATCH",
      { body: "Disabled" },
      1,
      403,
    );
    await api(`/api/comments/${comment.id}`, "DELETE", undefined, 0);
    await api(`/api/channels/${channel.id}`, "PATCH", settings, 0);
    const disposable = await api(
      `/api/posts/${post.id}/comments`,
      "POST",
      { body: "Delete with post" },
      1,
      201,
    );
    const image = await api("/api/uploads", "POST", { image: png }, 0, 201);
    const imagePost = await api(
      `/api/chats/${channel.id}/messages`,
      "POST",
      { type: "image", attachment: image.path },
      0,
      201,
    );
    assert.equal(
      (
        await fetch(base + image.path, {
          headers: { Authorization: "Bearer " + tokens[1] },
        })
      ).status,
      200,
    );
    await api(
      `/api/channels/${channel.id}/subscription`,
      "DELETE",
      undefined,
      1,
    );
    assert.deepEqual((await api("/api/chats", "GET", undefined, 1)).chats, []);
    assert.equal(
      (
        await fetch(base + image.path, {
          headers: { Authorization: "Bearer " + tokens[1] },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + channel.avatar_path, {
          headers: { Authorization: "Bearer " + tokens[1] },
        })
      ).status,
      200,
      "Public channel avatar",
    );
    await api(`/api/posts/${post.id}/comments`, "GET", undefined, 1, 404);
    await api(`/api/comments/${disposable.id}`, "DELETE", undefined, 1, 404);
    await api(
      `/api/channels/${channel.id}/subscription`,
      "DELETE",
      undefined,
      0,
      400,
    );
    await api(`/api/messages/${post.id}`, "DELETE", undefined, 0);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM channel_comments WHERE post_id = ?")
        .get(post.id).n,
      0,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM channel_views WHERE post_id = ?")
        .get(post.id).n,
      0,
    );
    await api(`/api/messages/${imagePost.id}`, "DELETE", undefined, 0);
    const next = await api(
      `/api/chats/${channel.id}/messages`,
      "POST",
      { type: "text", body: "Новый пост после удаления всех" },
      0,
      201,
    );
    assert.ok(next.id > imagePost.id, "Deleted ids must not be reused");
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
