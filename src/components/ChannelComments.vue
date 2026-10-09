<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import { useChannelComments } from "../composables/useChannelComments";
import { messageTime } from "../utils/messageDate";
import type { Message } from "../types/message";
import type { ChannelComment } from "../types/channel";
const props = defineProps<{
  post: Message;
  currentUserId: number;
  canModerate: boolean;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();
const state = useChannelComments(props.post.id, () => emit("changed"));
const { comments, enabled, busy, loading, error } = state;
const draft = ref("");
const editingId = ref<number | null>(null);
const confirmingId = ref<number | null>(null);
const list = useTemplateRef<HTMLDivElement>("comment-list");
const editor = useTemplateRef<HTMLTextAreaElement>("comment-editor");
const nearBottom = ref(true);
function measure() {
  const el = list.value;
  if (el)
    nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}
watch(
  () => comments.value.length,
  async () => {
    if (nearBottom.value) {
      await nextTick();
      list.value?.scrollTo({ top: list.value.scrollHeight });
    }
  },
);
async function edit(comment: ChannelComment) {
  editingId.value = comment.id;
  draft.value = comment.body;
  await nextTick();
  editor.value?.focus();
}
function cancelEdit() {
  editingId.value = null;
  draft.value = "";
}
async function submit() {
  const body = draft.value.trim();
  if (!body || !enabled.value || busy.value) return;
  const success =
    editingId.value === null
      ? await state.send(body)
      : await state.edit(editingId.value, body);
  if (success) {
    cancelEdit();
    nearBottom.value = true;
  }
}
async function remove(id: number) {
  if (await state.remove(id)) {
    confirmingId.value = null;
    if (editingId.value === id) cancelEdit();
  }
}
</script>
<template>
  <ModalDialog
    class="comments-dialog"
    label="Комментарии к посту"
    @close="!busy && emit('close')"
  >
    <section class="comments-panel">
      <header class="dialog-header">
        <h2>Комментарии · {{ comments.length }}</h2>
        <button
          class="close-button"
          aria-label="Закрыть комментарии"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div class="comment-post">
        <strong>{{ post.author_name }}</strong>
        <p>{{ post.type === "text" ? post.body : "Пост с изображением" }}</p>
      </div>
      <div ref="comment-list" class="comment-list" @scroll.passive="measure">
        <p v-if="loading" class="muted" role="status">Загрузка…</p>
        <p v-else-if="!comments.length" class="muted comment-empty">
          Пока нет комментариев
        </p>
        <article
          v-for="comment in comments"
          :key="comment.id"
          class="comment"
          :data-comment-id="comment.id"
        >
          <UserAvatar
            :user="{
              id: comment.author_id,
              display_name: comment.author_name,
              avatar_path: comment.author_avatar,
            }"
          />
          <div class="comment-body">
            <header>
              <strong>{{ comment.author_name }}</strong
              ><time>{{ messageTime(comment.created_at) }}</time>
            </header>
            <p>{{ comment.body }}</p>
            <div class="comment-actions">
              <button
                v-if="comment.author_id === currentUserId && enabled"
                type="button"
                :disabled="busy"
                :aria-label="'Изменить комментарий ' + comment.id"
                @click="edit(comment)"
              >
                Изменить</button
              ><button
                v-if="comment.author_id === currentUserId || canModerate"
                type="button"
                class="danger"
                :disabled="busy"
                :aria-label="'Удалить комментарий ' + comment.id"
                @click="confirmingId = comment.id"
              >
                Удалить
              </button>
            </div>
            <div v-if="confirmingId === comment.id" class="comment-confirm">
              <span>Удалить комментарий?</span
              ><button
                type="button"
                :disabled="busy"
                @click="confirmingId = null"
              >
                Отмена</button
              ><button
                type="button"
                class="danger"
                :disabled="busy"
                @click="remove(comment.id)"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </article>
      </div>
      <p v-if="error" class="form-error" role="alert">
        {{ error }}
        <button
          type="button"
          class="text-button"
          :disabled="busy"
          @click="state.load"
        >
          Повторить
        </button>
      </p>
      <form
        v-if="!loading && enabled"
        class="comment-composer"
        @submit.prevent="submit"
      >
        <div v-if="editingId" class="comment-editing">
          Редактирование
          <button type="button" :disabled="busy" @click="cancelEdit">
            Отмена
          </button>
        </div>
        <textarea
          ref="comment-editor"
          v-model="draft"
          maxlength="4096"
          rows="2"
          :placeholder="
            editingId ? 'Изменить комментарий…' : 'Написать комментарий…'
          "
          aria-label="Комментарий"
          :disabled="busy"
          @keydown.ctrl.enter.prevent="submit"
        /><button class="primary-button" :disabled="busy || !draft.trim()">
          {{
            busy
              ? "Отправка…"
              : editingId
                ? "Сохранить комментарий"
                : "Отправить комментарий"
          }}
        </button>
      </form>
      <p v-else-if="!loading" class="muted comments-disabled">
        Комментарии отключены владельцем канала
      </p>
    </section>
  </ModalDialog>
</template>
<style>
.account-dialog.comments-dialog {
  inset: 0 0 0 auto;
  margin: 0;
  width: min(440px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  border-radius: 20px 0 0 20px;
  overflow: hidden;
}
</style>
<style scoped>
.comments-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 16px;
}
.comment-post {
  padding: 12px;
  background: var(--field);
  border-radius: 12px;
  font-size: 12px;
}
.comment-post strong {
  color: var(--accent-link);
}
.comment-post p {
  margin: 6px 0 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
}
.comment-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.comment {
  display: flex;
  gap: 10px;
  padding: 12px 0;
}
.comment-body {
  flex: 1;
  min-width: 0;
}
.comment-body header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.comment-body time {
  color: var(--text-muted);
  font-size: 10px;
}
.comment-body p {
  font-size: var(--message-font-size);
  margin: 6px 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  line-height: 1.5;
}
.comment-actions {
  display: flex;
  gap: 12px;
}
.comment-actions button,
.comment-confirm button,
.comment-editing button {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
}
.comment-confirm {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  font-size: 12px;
}
.comment-empty {
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
}
.comment-composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comment-composer textarea {
  resize: vertical;
  max-height: 160px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--field);
  color: var(--text);
  padding: 10px 12px;
}
.comment-editing {
  display: flex;
  justify-content: space-between;
  color: var(--accent-link);
  font-size: 12px;
}
.comments-disabled {
  text-align: center;
  font-size: 12px;
}
</style>
