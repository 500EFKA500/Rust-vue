<script setup lang="ts">
import MediaImage from "./MediaImage.vue";
import { messageTime } from "../utils/messageDate";
import type { Message } from "../types/message.ts";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  message: Message;
  isOwn: boolean;
  close?: false;
  pending?: boolean;
  error?: string;
  channel?: boolean;
  commentsEnabled?: boolean;
}>();

const bubble = ref<HTMLElement | null>(null);
const editor = ref<HTMLTextAreaElement | null>(null);
const menuOpen = ref(false);
const editing = ref(false);
const confirmingDelete = ref(false);
const editDraft = ref("");
const pending = computed(() => props.pending ?? false);
const actionError = ref("");

const emit = defineEmits<{
  edit: [message: Message, body: string];
  delete: [message: Message];
  comments: [message: Message];
}>();

watch(
  () => props.error,
  (error) => {
    actionError.value = error ?? "";
  },
);

watch(
  () => props.pending,
  (isPending, wasPending) => {
    if (wasPending && !isPending && !props.error) {
      editing.value = false;
    }
  },
);

function closeActions() {
  if (pending.value) return;
  menuOpen.value = false;
  editing.value = false;
  confirmingDelete.value = false;
  actionError.value = "";
}
function dismissMenu(event: PointerEvent) {
  if (event.target instanceof Node && !bubble.value?.contains(event.target))
    menuOpen.value = false;
}
onMounted(() => document.addEventListener("pointerdown", dismissMenu));
onUnmounted(() => document.removeEventListener("pointerdown", dismissMenu));
async function startEditing() {
  if (!props.isOwn || props.message.type !== "text") return;
  editDraft.value = props.message.body ?? "";
  editing.value = true;
  menuOpen.value = false;
  confirmingDelete.value = false;
  actionError.value = "";
  await nextTick();
  editor.value?.focus();
}
function saveEdit() {
  const body = editDraft.value.trim();
  if (!body || pending.value || !props.isOwn) {
    return;
  }
  if (body === props.message.body) {
    closeActions();
    return;
  }
  actionError.value = "";
  emit("edit", props.message, body);
}

function removeMessage() {
  if (pending.value || !props.isOwn) {
    return;
  }
  actionError.value = "";
  emit("delete", props.message);
}

function toggleMenu() {
  if (!props.isOwn || pending.value) {
    return;
  }
  menuOpen.value = !menuOpen.value;
}

function confirmDelete() {
  confirmingDelete.value = true;
  menuOpen.value = false;
  editing.value = false;
  actionError.value = "";
}

const isImgOpen = ref(false);

const openModal = () => {
  isImgOpen.value = true;
};
const closeModal = () => {
  isImgOpen.value = false;
};
</script>

<template>
  <article
    ref="bubble"
    class="message"
    :data-message-id="message.id"
    @contextmenu.prevent="toggleMenu"
    @keydown.esc.stop="closeActions"
    :class="{
      'message--own': isOwn,
      'message--other': !isOwn,
      'message--channel': channel,
    }"
  >
    <button
      v-if="isOwn && !editing && !confirmingDelete"
      class="message-menu-trigger"
      type="button"
      aria-label="Действия с сообщением"
      :aria-expanded="menuOpen"
      @click="toggleMenu"
    >
      ⋯
    </button>
    <div v-if="menuOpen && isOwn" class="message-menu" role="menu">
      <button
        v-if="message.type === 'text'"
        type="button"
        role="menuitem"
        @click="startEditing"
      >
        Изменить
      </button>
      <button
        type="button"
        role="menuitem"
        class="danger"
        @click="confirmDelete"
      >
        Удалить
      </button>
    </div>
    <form v-if="editing" class="message-editor" @submit.prevent="saveEdit">
      <textarea
        ref="editor"
        v-model="editDraft"
        rows="3"
        aria-label="Текст сообщения"
        :disabled="pending"
        @keydown.ctrl.enter.prevent="saveEdit"
        @keydown.meta.enter.prevent="saveEdit"
      />
      <div class="action-buttons">
        <button type="button" :disabled="pending" @click="closeActions">
          Отмена
        </button>
        <button type="submit" :disabled="pending || !editDraft.trim()">
          {{ pending ? "Сохранение…" : "Сохранить" }}
        </button>
      </div>
    </form>
    <p v-else-if="message.type === 'text'">
      {{ message.body }}
    </p>

    <MediaImage
      v-if="message.type === 'image' && message.attachment"
      class="message-image"
      :class="{
        'message-sticker': message.attachment.startsWith('/media/stickers/'),
      }"
      :path="message.attachment"
      @click="openModal"
      alt="Превью"
    />

    <div v-if="confirmingDelete" class="delete-confirmation">
      <p>
        {{
          channel
            ? "Удалить пост и все комментарии к нему?"
            : "Удалить сообщение?"
        }}
      </p>
      <div class="action-buttons">
        <button type="button" :disabled="pending" @click="closeActions">
          Отмена
        </button>
        <button
          type="button"
          class="danger"
          :disabled="pending"
          @click="removeMessage"
        >
          {{ pending ? "Удаление…" : "Удалить" }}
        </button>
      </div>
    </div>
    <p v-if="actionError" class="action-error" role="alert">
      {{ actionError }}
    </p>

    <div
      v-if="isImgOpen && message.attachment"
      class="modal-overlay"
      @click.self="closeModal"
    >
      <div class="modal-content">
        <MediaImage
          class="modal-image"
          :path="message.attachment"
          alt="Увеличенное изображение"
        />
      </div>
    </div>

    <footer>
      <span
        v-if="channel"
        class="post-views"
        :aria-label="'Просмотры: ' + (message.view_count ?? 0)"
        ><svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" /></svg
        >{{ message.view_count ?? 0 }}</span
      >
      <span>{{ message.author_name }}</span>
      <span>|</span>
      <time
        :datetime="
          message.created_at.replace(' ', 'T') +
          (/Z|[+-]\d{2}:?\d{2}$/.test(message.created_at) ? '' : 'Z')
        "
        >{{ messageTime(message.created_at) }}</time
      >
    </footer>
    <button
      v-if="channel && (commentsEnabled || message.comment_count)"
      class="post-comments"
      type="button"
      @click="emit('comments', message)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"
        /></svg
      >{{
        message.comment_count
          ? "Комментарии · " + message.comment_count
          : "Оставить комментарий"
      }}<span aria-hidden="true">›</span>
    </button>
  </article>
</template>

<style scoped>
.message.message--channel {
  align-self: flex-start;
  width: min(520px, 100%);
  max-width: 100%;
  padding: 14px 32px 14px 16px;
}
.post-views {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-right: auto;
}
.post-views svg {
  width: 15px;
  height: 15px;
}
.post-comments {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 0 0;
  margin-top: 10px;
  border: 0;
  border-top: 1px solid currentColor;
  border-top-color: color-mix(in srgb, currentColor 15%, transparent);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
}
.post-comments svg {
  width: 18px;
  height: 18px;
}
.post-comments span {
  margin-left: auto;
  font-size: 18px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.modal-image {
  display: block;
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
  cursor: pointer;
}

.message {
  position: relative;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message-sticker {
  width: 150px;
  height: 150px;
  object-fit: contain;
}
.message--own {
  padding-right: 32px;
  align-self: flex-end;
  background: var(--accent);
}
.message--other {
  align-self: flex-start;
  background: var(--border);
}

.message p {
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message-menu-trigger {
  position: absolute;
  right: 4px;
  top: 3px;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--own-text);
  font-size: 21px;
  cursor: pointer;
}
.message-menu-trigger:hover {
  background: color-mix(in srgb, var(--own-text) 12%, transparent);
}
.message-menu {
  position: absolute;
  top: 30px;
  right: 4px;
  z-index: 10;
  width: 145px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  box-shadow: 0 6px 20px #0005;
}
.message-menu button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  text-align: left;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.message-menu button:hover {
  background: var(--hover);
}
.message-editor textarea {
  box-sizing: border-box;
  min-width: 160px;
  width: 100%;
  resize: vertical;
  padding: 8px;
  border: 1px solid var(--accent-link);
  border-radius: 6px;
  background: var(--field);
  color: var(--text);
  font: inherit;
}
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}
.action-buttons button {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--own-text) 12%, transparent);
  color: var(--own-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.action-buttons button:disabled {
  opacity: 0.5;
  cursor: default;
}
.message-menu .danger,
.action-buttons .danger {
  color: var(--danger);
}
.delete-confirmation {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}
.message .action-error {
  margin-top: 8px;
  color: var(--danger);
  font-size: 12px;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 10px;
}
</style>
