<script setup lang="ts">
import { onMounted, ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import { request } from "../services/api";
import type { Channel } from "../types/channel";
const props = defineProps<{ id: number; busy: boolean; error: string }>();
const emit = defineEmits<{
  close: [];
  subscribe: [id: number];
  leave: [];
  edit: [channel: Channel];
}>();
const channel = ref<Channel | null>(null);
const loadError = ref("");
const confirming = ref(false);
async function load() {
  loadError.value = "";
  try {
    channel.value = await request<Channel>(`/api/channels/${props.id}`);
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
onMounted(load);
</script>
<template>
  <ModalDialog label="Информация о канале" @close="!busy && emit('close')">
    <section class="profile-card">
      <header class="dialog-header">
        <h2>Канал</h2>
        <button
          class="close-button"
          aria-label="Закрыть информацию о канале"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div v-if="channel" class="channel-details">
        <UserAvatar
          :user="{
            id: channel.id,
            display_name: channel.title,
            avatar_path: channel.avatar_path,
          }"
        />
        <h3>{{ channel.title }}</h3>
        <span class="muted"
          >@{{ channel.username }} · Подписчики:
          {{ channel.subscriber_count }}</span
        >
        <p>{{ channel.description }}</p>
        <small class="muted">{{
          channel.comments_enabled
            ? "Комментарии включены"
            : "Комментарии отключены"
        }}</small>
        <button
          v-if="channel.can_post"
          class="secondary-button"
          :disabled="busy"
          @click="emit('edit', channel)"
        >
          Управление каналом
        </button>
        <button
          class="primary-button"
          :disabled="busy"
          @click="emit('subscribe', channel.id)"
        >
          {{
            busy
              ? "Открываем…"
              : channel.subscribed
                ? "Открыть канал"
                : "Подписаться"
          }}
        </button>
        <template v-if="channel.subscribed && !channel.can_post"
          ><button
            v-if="!confirming"
            class="text-button danger"
            :disabled="busy"
            @click="confirming = true"
          >
            Отписаться
          </button>
          <div v-else>
            <p>Отписаться от канала?</p>
            <div class="profile-actions">
              <button
                class="secondary-button"
                :disabled="busy"
                @click="confirming = false"
              >
                Отмена</button
              ><button
                class="primary-button"
                :disabled="busy"
                @click="emit('leave')"
              >
                Подтвердить отписку
              </button>
            </div>
          </div></template
        >
      </div>
      <p v-else-if="!loadError" class="muted" role="status">Загрузка…</p>
      <p v-if="error || loadError" class="form-error" role="alert">
        {{ error || loadError }}
      </p>
      <button v-if="loadError" class="text-button" @click="load">
        Повторить
      </button>
    </section>
  </ModalDialog>
</template>
<style scoped>
.channel-details {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  padding-top: 24px;
}
.channel-details h3,
.channel-details p {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.channel-details p {
  line-height: 1.6;
}
</style>
