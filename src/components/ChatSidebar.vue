<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import UserAvatar from "./UserAvatar.vue";
import pinIcon from "../assets/icons/pin.svg?raw";
import muteIcon from "../assets/icons/bell-off.svg?raw";
import channelIcon from "../assets/icons/channel.svg?raw";
import { request } from "../services/api";
import { messageTime } from "../utils/messageDate";
import type { Chat } from "../types/chats";
import type { User } from "../types/user";
import type { Channel } from "../types/channel";
const props = defineProps<{
  chats: Chat[];
  activeChatId: number;
  busy: boolean;
}>();
const emit = defineEmits<{
  select: [chat: Chat];
  write: [user: User];
  manage: [chat: Chat];
  menu: [];
  channel: [channel: Channel];
}>();
const search = ref("");
watch(
  () => props.activeChatId,
  () => {
    search.value = "";
  },
);
const users = ref<User[]>([]);
const channels = ref<Channel[]>([]);
const searching = ref(false);
const error = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
const filteredChats = computed(() => {
  const query = search.value.trim().replace(/^@/, "").toLocaleLowerCase("ru");
  return props.chats.filter(
    (chat) =>
      !query ||
      chat.title.toLocaleLowerCase("ru").includes(query) ||
      chat.peer_username.toLowerCase().includes(query),
  );
});
watch(search, (value) => {
  const version = ++revision;
  clearTimeout(timer);
  users.value = [];
  channels.value = [];
  error.value = "";
  searching.value = false;
  const query = value.trim().replace(/^@/, "");
  if (query.length < 2) return;
  searching.value = true;
  timer = setTimeout(async () => {
    try {
      const [result, foundChannels] = await Promise.all([
        request<User[]>("/api/users?q=" + encodeURIComponent(query)),
        request<Channel[]>("/api/channels?q=" + encodeURIComponent(query)),
      ]);
      if (version === revision) {
        users.value = result;
        channels.value = foundChannels.filter(
          (item) => !props.chats.some((chat) => chat.id === item.id),
        );
      }
    } catch (cause) {
      if (version === revision)
        error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (version === revision) searching.value = false;
    }
  }, 250);
});
function write(user: User) {
  if (props.busy) return;
  emit("write", user);
  search.value = "";
}
function openChannel(channel: Channel) {
  if (!props.busy) emit("channel", channel);
}
function select(chat: Chat) {
  emit("select", chat);
  search.value = "";
}
function peer(chat: Chat) {
  return {
    id: chat.peer_id,
    display_name: chat.title,
    avatar_path: chat.avatar_path,
  };
}
function time(value: string | null) {
  return value ? messageTime(value) : "";
}
onUnmounted(() => {
  revision++;
  clearTimeout(timer);
});
</script>
<template>
  <aside class="sidebar" aria-label="Список чатов">
    <div class="sidebar-search">
      <button
        class="sidebar-menu-button"
        type="button"
        aria-label="Открыть меню аккаунтов"
        @click="emit('menu')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" /></svg
      ><input
        v-model="search"
        type="search"
        maxlength="64"
        aria-label="Поиск пользователей и чатов"
        placeholder="Поиск"
      /><button
        v-if="search"
        type="button"
        aria-label="Очистить поиск"
        @click="search = ''"
      >
        ×
      </button>
    </div>
    <div class="sidebar-list">
      <p v-if="search && filteredChats.length" class="list-label">Чаты</p>
      <article
        v-for="chat in filteredChats"
        :key="chat.id"
        class="chat-row"
        :class="{ active: chat.id === activeChatId }"
        @contextmenu.prevent="emit('manage', chat)"
      >
        <button
          class="chat-button"
          :disabled="busy"
          :aria-label="'Открыть чат: ' + chat.title"
          :aria-current="chat.id === activeChatId ? 'true' : undefined"
          @click="select(chat)"
        >
          <UserAvatar :user="peer(chat)" />
          <span class="chat-summary">
            <span class="chat-top"
              ><strong
                ><span
                  v-if="chat.kind === 'channel'"
                  class="channel-mark"
                  aria-label="Канал"
                  v-html="channelIcon"
                />{{ chat.title }}</strong
              ><time>{{ time(chat.last_message_at) }}</time></span
            >
            <span class="chat-bottom"
              ><span class="chat-preview">{{
                chat.last_message ||
                (chat.kind === "group"
                  ? "Групповой чат"
                  : "@" + chat.peer_username)
              }}</span
              ><span
                v-if="chat.muted"
                class="muted-icon"
                title="Уведомления отключены"
                aria-label="Уведомления отключены"
                v-html="muteIcon"
              /><span
                v-if="chat.pinned_at"
                class="pin-icon"
                title="Закреплён"
                aria-label="Закреплён"
                v-html="pinIcon"
              /><span
                v-if="chat.unread_count > 0"
                class="unread-badge"
                :class="{ muted: chat.muted }"
                :aria-label="'Непрочитанных: ' + chat.unread_count"
                >{{ chat.unread_count > 99 ? "99+" : chat.unread_count }}</span
              ></span
            >
          </span>
        </button>
        <button
          class="chat-more"
          type="button"
          :disabled="busy"
          :aria-label="'Действия с чатом: ' + chat.title"
          @click="emit('manage', chat)"
        >
          ⋯
        </button>
      </article>
      <p v-if="channels.length" class="list-label">Каналы</p>
      <button
        v-for="channel in channels"
        :key="channel.id"
        class="user-result channel-result"
        :disabled="busy"
        :aria-label="'Канал: ' + channel.title + ' @' + channel.username"
        @click="openChannel(channel)"
      >
        <UserAvatar
          :user="{
            id: channel.id,
            display_name: channel.title,
            avatar_path: channel.avatar_path,
          }"
        /><span
          ><strong>{{ channel.title }}</strong
          ><small
            >@{{ channel.username }} · {{ channel.subscriber_count }}</small
          ></span
        ><span class="write-icon" aria-hidden="true">↗</span>
      </button>
      <p v-if="users.length" class="list-label">Пользователи</p>
      <p v-if="searching" class="sidebar-note" role="status">Поиск…</p>
      <p v-if="error" class="form-error sidebar-note" role="alert">
        {{ error }}
      </p>
      <button
        v-for="user in users"
        :key="user.id"
        class="user-result"
        :disabled="busy"
        :aria-label="'Написать: ' + user.display_name + ' @' + user.username"
        @click="write(user)"
      >
        <UserAvatar :user="user" /><span
          ><strong>{{ user.display_name }}</strong
          ><small>@{{ user.username }}</small></span
        ><span class="write-icon" aria-hidden="true">↗</span>
      </button>
      <p
        v-if="
          search.trim().length >= 2 &&
          !searching &&
          !users.length &&
          !channels.length &&
          !filteredChats.length &&
          !error
        "
        class="sidebar-note"
      >
        Ничего не найдено
      </p>
      <p v-if="!search && !chats.length" class="sidebar-empty">
        Пока нет диалогов.<br />Найдите пользователя по имени или @логину, чтобы
        написать.
      </p>
      <p v-if="search && search.trim().length < 2" class="sidebar-note">
        Для поиска пользователей введите минимум 2 символа.
      </p>
    </div>
  </aside>
</template>
<style scoped>
.sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
  background: var(--sidebar);
}
.sidebar-search {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.sidebar-search .sidebar-menu-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
}
.sidebar-search .sidebar-menu-button svg {
  width: 22px;
  height: 22px;
}
.sidebar-menu-button:hover {
  background: var(--hover);
}
.sidebar-search svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--text-muted);
}
.sidebar-search input {
  width: 0;
  flex: 1;
  padding: 9px 10px;
  border: 0;
  border-radius: 20px;
  background: var(--field);
  color: var(--text);
  outline-color: var(--accent);
}
.sidebar-search button {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 22px;
}
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.chat-row {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 12px;
  margin-bottom: 3px;
}
.chat-row:hover,
.chat-row.active {
  background: var(--hover);
}
.chat-button {
  min-width: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 28px 12px 8px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  border-radius: 12px;
}
.chat-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-top,
.chat-bottom {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chat-top strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: 14px;
}
.channel-mark {
  display: inline-block;
  width: 14px;
  height: 14px;
  vertical-align: -2px;
  margin-right: 4px;
}
.channel-mark :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.chat-top time {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}
.chat-preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 12px;
}
.chat-more {
  position: absolute;
  top: 8px;
  right: 2px;
  width: 26px;
  height: 28px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  font-size: 20px;
}
.chat-more:hover {
  color: var(--accent-link);
  background: var(--field);
}
.unread-badge {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 99px;
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.unread-badge.muted {
  background: var(--text-muted);
  color: white;
}
.muted-icon,
.pin-icon {
  color: var(--text-muted);
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.muted-icon :deep(svg),
.pin-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
.list-label {
  padding: 8px;
  margin: 0;
  color: var(--accent-link);
  font-size: 12px;
}
.sidebar-note,
.sidebar-empty {
  padding: 12px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}
.sidebar-empty {
  margin-top: 28px;
  text-align: center;
}
.user-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  text-align: left;
}
.user-result:hover {
  background: var(--hover);
}
.user-result > span:nth-child(2) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.user-result small {
  color: var(--text-muted);
}
.write-icon {
  color: var(--accent-link);
}
@media (max-width: 720px) {
  .sidebar {
    width: 240px;
  }
}
</style>
