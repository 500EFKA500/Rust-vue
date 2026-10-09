<script setup lang="ts">
import { ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import pinIcon from "../assets/icons/pin.svg?raw";
import muteIcon from "../assets/icons/bell-off.svg?raw";
import trashIcon from "../assets/icons/trash.svg?raw";
import type { Chat } from "../types/chats";
defineProps<{ chat: Chat; busy: boolean; error: string }>();
const emit = defineEmits<{
  close: [];
  update: [settings: { muted?: boolean; pinned?: boolean }];
  remove: [];
  info: [];
}>();
const confirming = ref(false);
</script>
<template>
  <ModalDialog
    :label="confirming ? 'Удаление чата' : 'Действия с чатом'"
    @close="!busy && emit('close')"
  >
    <section class="profile-card">
      <header class="dialog-header">
        <h2>{{ confirming ? "Удалить чат?" : chat.title }}</h2>
        <button
          class="close-button"
          aria-label="Закрыть действия с чатом"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <template v-if="confirming">
        <p class="delete-description">
          <template v-if="chat.kind === 'channel'"
            >Канал и загруженная история исчезнут из вашего списка. Вы
            останетесь подписаны: новый пост вернёт канал в список. Для отписки
            откройте «О канале».</template
          >
          <template v-else
            >Чат {{ chat.title }} и история исчезнут у вас. У остальных
            переписка останется. При новом сообщении чат появится
            снова.</template
          >
        </p>
        <div class="profile-actions">
          <button
            class="secondary-button"
            :disabled="busy"
            @click="confirming = false"
          >
            Отмена</button
          ><button
            class="primary-button delete-button"
            :disabled="busy"
            @click="emit('remove')"
          >
            {{ busy ? "Удаление…" : "Удалить чат" }}
          </button>
        </div>
      </template>
      <nav v-else class="menu-actions">
        <button
          v-if="chat.kind === 'channel'"
          :disabled="busy"
          @click="emit('info')"
        >
          О канале
        </button>
        <button
          :disabled="busy"
          @click="emit('update', { pinned: !chat.pinned_at })"
        >
          <span aria-hidden="true" v-html="pinIcon" />{{
            chat.pinned_at ? "Открепить" : "Закрепить"
          }}
        </button>
        <button
          :disabled="busy"
          @click="emit('update', { muted: !chat.muted })"
        >
          <span aria-hidden="true" v-html="muteIcon" />{{
            chat.muted ? "Включить уведомления" : "Отключить уведомления"
          }}
        </button>
        <button class="danger" :disabled="busy" @click="confirming = true">
          <span aria-hidden="true" v-html="trashIcon" />Удалить чат
        </button>
      </nav>
      <p v-if="error" class="form-error" role="alert">
        {{ error }}
      </p>
    </section>
  </ModalDialog>
</template>
<style scoped>
.delete-description {
  margin: 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.delete-button {
  background: #bb3548;
}
.menu-actions span {
  width: 22px;
  height: 22px;
}
.menu-actions :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
