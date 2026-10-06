<script setup lang="ts">
import { getFileUrl } from "../types/file.ts";
import type { Message } from "../types/message.ts";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  message: Message;
  isOwn: boolean;
  close?: false;
  pending?: boolean;
  error?: string;
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
    <div
      v-if="menuOpen && isOwn"
      class="message-menu"
      role="menu"
    >
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
    <form
      v-if="editing"
      class="message-editor"
      @submit.prevent="saveEdit"
    >
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
        <button
          type="button"
          :disabled="pending"
          @click="closeActions"
        >
          Отмена
        </button>
        <button
          type="submit"
          :disabled="pending || !editDraft.trim()"
        >
          {{ pending ? "Сохранение…" : "Сохранить" }}
        </button>
      </div>
    </form>
    <p v-else-if="message.type === 'text'">
      {{ message.body }}
    </p>

    <img
      v-if="message.type === 'image' && message.attachment"
      class="message-image"
      :class="{ 'message-sticker': message.attachment.startsWith('/media/stickers/') }"
      :src="getFileUrl(message.attachment)"
      @click="openModal"
      alt="Превью"
    />

    <div
      v-if="confirmingDelete"
      class="delete-confirmation"
    >
      <p>Удалить сообщение?</p>
      <div class="action-buttons">
        <button
          type="button"
          :disabled="pending"
          @click="closeActions"
        >
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
    <p
      v-if="actionError"
      class="action-error"
      role="alert"
    >
      {{ actionError }}
    </p>

    <div
      v-if="isImgOpen && message.attachment"
      class="modal-overlay"
      @click.self="closeModal"
    >
      <div class="modal-content">
        <img
          class="modal-image"
          :src="getFileUrl(message.attachment)"
          alt="Увеличенное изображение"
        />
      </div>
    </div>

    <footer>
      <span>{{ message.author_name }}</span>
      <span>|</span>
      <span>{{ message.created_at }}</span>
    </footer>
  </article>
</template>

<style scoped>
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
  background: #386be0;
}
.message--other {
  align-self: flex-start;
  background: #252830;
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
  color: #d4e1ff;
  font-size: 21px;
  cursor: pointer;
}
.message-menu-trigger:hover {
  background: #ffffff20;
}
.message-menu {
  position: absolute;
  top: 30px;
  right: 4px;
  z-index: 10;
  width: 145px;
  padding: 4px;
  border: 1px solid #364154;
  border-radius: 9px;
  background: #202733;
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
  color: #eef3ff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.message-menu button:hover {
  background: #ffffff10;
}
.message-editor textarea {
  box-sizing: border-box;
  min-width: 160px;
  width: 100%;
  resize: vertical;
  padding: 8px;
  border: 1px solid #9dbfff;
  border-radius: 6px;
  background: #1c2c49;
  color: white;
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
  background: #ffffff20;
  color: white;
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
  color: #ffb6b6;
}
.delete-confirmation {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #ffffff30;
  font-size: 13px;
}
.message .action-error {
  margin-top: 8px;
  color: #ffd3d3;
  font-size: 12px;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #b5bbc7;
  font-size: 10px;
}
</style>
