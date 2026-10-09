<script setup lang="ts">
import { ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import type { Channel, ChannelUpdate } from "../types/channel";
const props = defineProps<{
  channel?: Channel | null;
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{ close: []; save: [value: ChannelUpdate] }>();
const title = ref(props.channel?.title ?? "");
const description = ref(props.channel?.description ?? "");
const username = ref(props.channel?.username ?? "");
const commentsEnabled = ref(Boolean(props.channel?.comments_enabled ?? true));
const avatar = ref<string | null | undefined>(undefined);
const validation = ref("");
function chooseAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  validation.value = "";
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      file.type,
    ) ||
    file.size > 2 * 1024 * 1024
  ) {
    validation.value = "Выберите PNG, JPEG, WebP или GIF до 2 МБ.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    avatar.value = String(reader.result);
  };
  reader.onerror = () => {
    validation.value = "Не удалось прочитать изображение.";
  };
  reader.readAsDataURL(file);
}
function submit() {
  emit("save", {
    title: title.value.trim(),
    description: description.value.trim(),
    username: username.value.trim(),
    commentsEnabled: commentsEnabled.value,
    ...(avatar.value === undefined ? {} : { avatar: avatar.value }),
  });
}
</script>
<template>
  <ModalDialog
    :label="channel ? 'Настройки канала' : 'Новый канал'"
    @close="!busy && emit('close')"
  >
    <section class="profile-card">
      <header class="dialog-header">
        <h2>{{ channel ? "Настройки канала" : "Новый канал" }}</h2>
        <button
          class="close-button"
          aria-label="Закрыть настройки канала"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div class="channel-avatar">
        <img v-if="avatar" :src="avatar" alt="Новый аватар канала" /><UserAvatar
          v-else
          :user="{
            id: channel?.id ?? 0,
            display_name: title || 'Канал',
            avatar_path:
              avatar === null ? null : (channel?.avatar_path ?? null),
          }"
        /><label class="text-button"
          >Изменить фото<input
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :disabled="busy"
            @change="chooseAvatar" /></label
        ><button
          v-if="avatar || (avatar !== null && channel?.avatar_path)"
          type="button"
          class="text-button danger"
          :disabled="busy"
          @click="avatar = null"
        >
          Удалить фото
        </button>
      </div>
      <form class="account-form" @submit.prevent="submit">
        <label
          >Название канала<input
            v-model="title"
            required
            maxlength="80"
            :disabled="busy"
        /></label>
        <label
          >Адрес канала<input
            v-model="username"
            aria-label="Адрес канала"
            required
            pattern="@?[A-Za-z][A-Za-z0-9_]{4,31}"
            maxlength="33"
            placeholder="@desire_news"
            :disabled="busy"
          /><small class="muted"
            >5–32 латинских символа, цифры или _. Канал доступен в поиске всем
            пользователям.</small
          ></label
        >
        <label
          >Описание<textarea
            v-model="description"
            maxlength="500"
            rows="3"
            :disabled="busy"
          />
        </label>
        <label class="channel-toggle"
          ><input
            v-model="commentsEnabled"
            type="checkbox"
            :disabled="busy"
          />Разрешить комментарии</label
        >
        <p v-if="error || validation" class="form-error" role="alert">
          {{ error || validation }}
        </p>
        <button
          class="primary-button"
          :disabled="busy || !title.trim() || !username.trim()"
        >
          {{
            busy ? "Сохранение…" : channel ? "Сохранить канал" : "Создать канал"
          }}
        </button>
      </form>
    </section>
  </ModalDialog>
</template>
<style scoped>
.channel-avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.channel-avatar img {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: 50%;
}
.account-form .channel-toggle {
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 10px;
}
.channel-toggle input {
  width: auto;
  accent-color: var(--accent);
}
</style>
