<script setup lang="ts">
import type { Chat } from "../types/chats";

defineProps<{
  chats: Chat[];

  activeChatId: number;
}>();

const emit = defineEmits<{
  select: [chat: Chat];
}>();

function selectChat(chat: Chat){
  emit("select", chat);
}
</script>

<template>
<aside class="sidebar">
  <div class="sidebar__header">
    Чаты
  </div>

  <div class="sidebar__list">
    <button
      v-for="chat in chats"
      :key="chat.id"
      type="button"
      class="chat-button"
      :class="{
        'chat-button--active':
        chat.id === activeChatId
      }"
      @click="selectChat(chat)"
    >
      <strong class="chat-button__title">
        {{ chat.title }}
      </strong>

      <span class="chat-button__subtitle">
        {{ chat.subtitle }}
      </span>
    </button>
  </div>
</aside>
</template>

<style scoped>
.sidebar{
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  min-height: 0;

  border-right: 1px solid #252830;

  background: #15171c;
}

.sidebar__header{
  flex-shrink: 0;
  padding: 18px;
  border-bottom: 1px solid #252830;
  font-weight: 600;
}

.sidebar__list{
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.chat-button{
  width: 100%;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #f2f3f5;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.chat-button:hover{
  background: #20232a;
}

.chat-button--active{
  background: #292c34;
}
.chat-button__title{
  font-size: 14px;
}
.chat-button__subtitle{
  color: #858c98;
  font-size: 12px;
}


</style>