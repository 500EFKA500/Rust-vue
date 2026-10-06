<script setup lang="ts">
import { nextTick, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import ExpressionPanel from "./ExpressionPanel.vue";
import smileIcon from "../assets/icons/smile.svg?raw";
import attachmentIcon from "../assets/icons/attachment.svg?raw";

const emit = defineEmits<{
  send: [body: string];
  sendImage: [path: string];
}>();

const draft = ref("");
const input = ref<HTMLInputElement | null>(null);
const panelOpen = ref(false);
const error = ref("");
const importing = ref(false);

function submitMessage() {
  const body = draft.value.trim();
  if (!body) {
    return;
  }
  emit("send", body);
  draft.value = "";
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
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
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
        :disabled="importing"
        @click="selectImage"
      >
        <span v-html="attachmentIcon" />
      </button>
      <input
        ref="input"
        v-model="draft"
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
        :disabled="!draft.trim()"
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
  background: #17191f;
}
.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #252830;
}
button {
  cursor: pointer;
  font: inherit;
}
button:focus-visible {
  outline: 2px solid #79a8ff;
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
  color: #909baa;
  background: transparent;
}
.icon-button:hover,
.icon-button.active {
  color: #79a8ff;
  background: #242d3e;
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
  border: 1px solid #343842;
  border-radius: 9px;
  outline: none;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}
.composer input:focus {
  border-color: #4f7fea;
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
  background: #386be0;
}
.send-button svg {
  width: 22px;
  height: 22px;
}

.error {
  padding: 8px 16px;
  margin: 0;
  color: #ff9b9b;
  font-size: 12px;
}
@media (max-width: 620px) {
  .composer {
    padding: 10px 8px;
    gap: 4px;
  }
}
</style>
