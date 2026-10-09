<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import MessageBubble from "./MessageBubble.vue";
import ModalDialog from "./ModalDialog.vue";
import { dateKey, dateLabel } from "../utils/messageDate";
import type { Message } from "../types/message";

const props = defineProps<{
  messages: Message[];
  currentUserId: number;
  pendingMessageId: number | null;
  messageError: { messageId: number | null; text: string };
  channel?: boolean;
  commentsEnabled?: boolean;
}>();
const emit = defineEmits<{
  edit: [message: Message, body: string];
  delete: [message: Message];
  comments: [message: Message];
}>();
const scroller = useTemplateRef<HTMLDivElement>("scroller");
const nearBottom = ref(true);
const calendarOpen = ref(false);
const selectedDay = ref("");
const dateElements = new Map<string, HTMLElement>();
const days = computed(() => {
  const groups: { key: string; label: string; messages: Message[] }[] = [];
  for (const message of props.messages) {
    const key = dateKey(message.created_at);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dateLabel(key), messages: [] };
      groups.push(group);
    }
    group.messages.push(message);
  }
  return groups;
});
function measureScroll() {
  const el = scroller.value;
  if (el)
    nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
}
async function scrollToBottom(smooth = false) {
  await nextTick();
  const el = scroller.value;
  el?.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "instant",
  });
}
watch(
  () => props.messages[props.messages.length - 1]?.id,
  (id, previousId) => {
    if (id === undefined) return;
    // Входящие сообщения не отрывают пользователя от чтения старой истории.
    if (
      previousId === undefined ||
      nearBottom.value ||
      props.messages[props.messages.length - 1]?.author_id ===
        props.currentUserId
    )
      void scrollToBottom(previousId !== undefined);
  },
);
function openCalendar(key: string) {
  selectedDay.value = key;
  calendarOpen.value = true;
}
function registerDay(key: string, el: unknown) {
  if (el instanceof HTMLElement) dateElements.set(key, el);
  else dateElements.delete(key);
}
async function jumpToDay(key: string) {
  const target =
    days.value.find((day) => day.key >= key) ??
    days.value[days.value.length - 1];
  if (!target) return;
  calendarOpen.value = false;
  await nextTick();
  const el = scroller.value;
  const date = dateElements.get(target.key);
  if (el && date)
    el.scrollTo({
      top:
        date.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        12,
      behavior: "smooth",
    });
}
onMounted(() => {
  void scrollToBottom();
});
</script>
<template>
  <div ref="scroller" class="messages" @scroll.passive="measureScroll">
    <div class="messages-inner">
      <div v-if="messages.length === 0" class="empty">
        <strong>{{
          channel ? "Пока нет публикаций" : "Здесь пока пусто"
        }}</strong
        ><span>{{
          channel ? "Новые посты появятся здесь" : "Напишите первое сообщение"
        }}</span>
      </div>
      <section
        v-for="day in days"
        :key="day.key"
        :ref="(el) => registerDay(day.key, el)"
        class="message-day"
        :aria-label="day.label"
        :data-day="day.key"
      >
        <div class="date-divider">
          <button
            type="button"
            :aria-label="'Перейти к дате: ' + day.label"
            @click="openCalendar(day.key)"
          >
            {{ day.label }}
          </button>
        </div>
        <MessageBubble
          v-for="message in day.messages"
          :key="message.id"
          :message="message"
          :is-own="message.author_id === currentUserId"
          :channel="channel"
          :comments-enabled="commentsEnabled"
          :pending="pendingMessageId === message.id"
          :error="
            messageError.messageId === message.id ? messageError.text : ''
          "
          @edit="(message, body) => emit('edit', message, body)"
          @delete="(message) => emit('delete', message)"
          @comments="(message) => emit('comments', message)"
        />
      </section>
    </div>
  </div>
  <ModalDialog
    v-if="calendarOpen"
    label="Перейти к дате"
    @close="calendarOpen = false"
  >
    <section class="profile-card">
      <header class="dialog-header">
        <h2>Перейти к дате</h2>
        <button
          class="close-button"
          aria-label="Закрыть выбор даты"
          @click="calendarOpen = false"
        >
          ×
        </button>
      </header>
      <form class="account-form" @submit.prevent="jumpToDay(selectedDay)">
        <label
          >Дата<input
            v-model="selectedDay"
            type="date"
            required
            :min="days[0]?.key"
            :max="days[days.length - 1]?.key"
        /></label>
        <button class="primary-button" :disabled="!selectedDay">Перейти</button>
      </form>
      <nav class="available-days" aria-label="Даты сообщений">
        <button
          v-for="day in days"
          :key="day.key"
          type="button"
          @click="jumpToDay(day.key)"
        >
          {{ day.label }}<small>{{ day.messages.length }}</small>
        </button>
      </nav>
      <p class="muted date-note">
        Переход по загруженной истории. Если в этот день сообщений нет,
        откроется ближайший следующий день.
      </p>
    </section>
  </ModalDialog>
</template>
<style scoped>
.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 24px 24px;
  scroll-padding-top: 12px;
}
.messages-inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;
}
.message-day {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.date-divider {
  position: sticky;
  top: 0;
  z-index: 5;
  align-self: center;
  padding: 4px 0;
}
.date-divider button {
  padding: 5px 12px;
  border: 0;
  border-radius: 20px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  backdrop-filter: blur(10px);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 1px 4px #0001;
}
.date-divider button:hover {
  color: var(--accent-link);
}
.empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: var(--text-muted);
}
.available-days {
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
  margin-top: 16px;
}
.available-days button {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.available-days button:hover {
  background: var(--hover);
}
.available-days small,
.date-note {
  color: var(--text-muted);
  font-size: 12px;
}
.date-note {
  line-height: 1.5;
}
</style>
