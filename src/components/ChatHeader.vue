<script setup lang="ts">
import UserAvatar from "./UserAvatar.vue";
import type { Chat } from "../types/chats";
defineProps<{ chat: Chat; busy: boolean }>();
const emit = defineEmits<{ menu: []; info: [] }>();
</script>
<template>
  <header class="chat-header">
    <UserAvatar
      :user="{
        id: chat.peer_id,
        display_name: chat.title,
        avatar_path: chat.avatar_path,
      }"
    />
    <button
      v-if="chat.kind !== 'direct'"
      class="chat-heading group-heading"
      :aria-label="
        chat.kind === 'channel' ? 'Информация о канале' : 'Информация о группе'
      "
      @click="emit('info')"
    >
      <h2>{{ chat.title }}</h2>
      <p>
        {{ chat.kind === "channel" ? "Подписчики" : "Участники" }}:
        {{ chat.member_count }}
      </p>
    </button>
    <div v-else class="chat-heading">
      <h2>{{ chat.title }}</h2>
      <p>@{{ chat.peer_username }}</p>
    </div>
    <button
      class="chat-header-menu"
      type="button"
      aria-label="Действия с текущим чатом"
      :disabled="busy"
      @click="emit('menu')"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
      </svg>
    </button>
  </header>
</template>
<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.chat-heading {
  min-width: 0;
  flex: 1;
}
.group-heading {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
}
h2 {
  margin: 0;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}
.chat-header-menu {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
}
.chat-header-menu:hover {
  background: var(--hover);
  color: var(--accent-link);
}
svg {
  width: 22px;
  height: 22px;
}
</style>
