<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import ExpressionPanel from "./ExpressionPanel.vue";
import smileIcon from "../assets/icons/smile.svg?raw";
import attachmentIcon from "../assets/icons/attachment.svg?raw";

const props = defineProps<{ pending: boolean; sendError: string; sentVersion: number }>();

const emit = defineEmits<{
  send: [body: string];
  sendImage: [path: string];
}>();

const draft = ref("");
const input = ref<HTMLInputElement | null>(null);
const panelOpen = ref(false);
const error = ref("");
const importing = ref(false);
watch(
  () => props.sentVersion,
  () => {
    draft.value = "";
  },
);

function submitMessage() {
  const body = draft.value.trim();
  if (!body || props.pending) {
    return;
  }
  emit("send", body);
}

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function closePanel() {
  panelOpen.value = false;
}

async function insertEmoji(emoji: string) {
  const start = input.value?.selectionStart ?? draft.value.length;
  const end = input.value?.selectionEnd ?? start;
  draft.value = draft.value.slice(0, start) + emoji + draft.value.slice(end);
  await nextTick();
  input.value?.focus();
  input.value?.setSelectionRange(start + emoji.length, start + emoji.length);
}

function sendMedia(path: string) {
  if (props.pending) return;
  emit("sendImage", path);
  closePanel();
}

async function selectImage() {
  error.value = "";
  importing.value = true;
  try {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "Изображения",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });
    if (!file || Array.isArray(file)) {
      return;
    }
    const savedPath = await invoke<string>("save_attachment", { source: file });
    sendMedia(savedPath);
  } catch (cause) {
    error.value = "Не удалось добавить файл: " + String(cause);
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div
    class="composer-area"
    @keydown.esc="closePanel"
  >
    <ExpressionPanel
      v-show="panelOpen"
      @emoji="insertEmoji"
      @send-image="sendMedia"
      @close="closePanel"
    />
    <p
      v-if="error || sendError"
      class="error"
      role="alert"
    >
      {{ error || sendError }}
    </p>
    <form
      class="composer"
      @submit.prevent="submitMessage"
    >
      <button
        type="button"
        class="icon-button"
        aria-label="Прикрепить изображение"
        title="Прикрепить изображение"
        :disabled="importing || pending"
        @click="selectImage"
      >
        <span v-html="attachmentIcon" />
      </button>
      <input
        ref="input"
        v-model="draft"
        :disabled="pending"
        type="text"
        placeholder="Написать сообщение…"
        autocomplete="off"
        aria-label="Сообщение"
      />
      <button
        type="button"
        class="icon-button"
        :class="{ active: panelOpen }"
        aria-label="Эмодзи, стикеры и GIF"
        aria-controls="expression-panel"
        :aria-expanded="panelOpen"
        title="Эмодзи, стикеры и GIF"
        @click="togglePanel"
      >
        <span v-html="smileIcon" />
      </button>
      <button
        type="submit"
        class="send-button"
        aria-label="Отправить"
        title="Отправить"
        :disabled="pending || !draft.trim()"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m21 3-7 18-4-7-7-4 18-7Z" />
          <path d="m10 14 11-11" />
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
.composer-area {
  flex-shrink: 0;
  min-width: 0;
  background: var(--surface);
}
.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
button {
  cursor: pointer;
  font: inherit;
}
button:focus-visible {
  outline: 2px solid var(--accent-link);
  outline-offset: -2px;
}
button:disabled {
  cursor: default;
  opacity: 0.5;
}
.icon-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 42px;
  flex-shrink: 0;
  padding: 8px;
  border: 0;
  border-radius: 9px;
  color: var(--text-muted);
  background: transparent;
}
.icon-button:hover,
.icon-button.active {
  color: var(--accent-link);
  background: var(--accent-soft);
}
.icon-button span {
  width: 24px;
  height: 24px;
}
.icon-button :deep(svg) {
  width: 100%;
  height: 100%;
}
.composer input {
  flex: 1;
  width: 0;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  outline: none;
  color: var(--text);
  background: var(--field);
  font: inherit;
}
.composer input:focus {
  border-color: var(--accent);
}
.send-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  padding: 9px;
  border: 0;
  border-radius: 50%;
  color: white;
  background: var(--accent);
}
.send-button svg {
  width: 22px;
  height: 22px;
}

.error {
  padding: 8px 16px;
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
@media (max-width: 620px) {
  .composer {
    padding: 10px 8px;
    gap: 4px;
  }
}
</style>
