<script setup lang="ts">
import {
  nextTick,       // Позволяет дождаться моментка, когда Vue обновит HTML
  onMounted,
  useTemplateRef, // Дает возможность получить ссылку на html-элемент из tamplate
  watch,          // Позволяет следить за изменением выбранных данных
} from "vue";

import MessageBubble from "./MessageBubble.vue";

import type {Message} from "../types/messages.ts";

const props = defineProps<{
  messages: Message[];
}>();

const bottomAnchor = useTemplateRef<HTMLDivElement>("bottom-anchor")

async function scrollToBottom(){
  /* Нужно дождаться обновления DOM */
  await nextTick();

  bottomAnchor.value?.scrollIntoView({
    behavior: "smooth",

    block: "end",
  });
}

function getMessageCount(){
  return props.messages.length;
}

watch(
    getMessageCount,
    scrollToBottom,
);

onMounted(scrollToBottom);
</script>

<template>
  <div class="messages">
    <div class="messages-inner">
      <div
          v-if="messages.length === 0"
          class="empty"
      >
        <strong> Здесь пока пусто </strong>
        <span> Напишите первое сообщение</span>
      </div>

      <MessageBubble
          v-for="message in messages"
          :key="message.id"
          :message="message"
      />
    </div>
    <div
      ref="bottom-anchor"
      class="bottom-anchor"
      aria-hidden="true"
    ></div>
  </div>
</template>

<style scoped>
.bottom-anchor{
  height: 1px;
  flex-shrink: 0;
}

.messages{
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.messages-inner{
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.empty{
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: #858c98;
}
</style>