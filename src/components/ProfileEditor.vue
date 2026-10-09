<script setup lang="ts">
import { computed, ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import AppearanceSettings from "./AppearanceSettings.vue";
import type { Appearance } from "../types/appearance";
import type { ProfileUpdate, User } from "../types/user";
const props = defineProps<{
  user: User;
  busy: boolean;
  error: string;
  initialTab?: "profile" | "appearance";
  appearanceValue?: Appearance;
  appearanceStatus: string;
  appearanceError: string;
}>();
const emit = defineEmits<{
  save: [profile: ProfileUpdate];
  changeAppearance: [appearance: Appearance];
  flushAppearance: [];
  close: [];
}>();
const tab = ref(props.initialTab ?? "profile");
function selectTab(value: "profile" | "appearance") {
  tab.value = value;
  emit("flushAppearance");
}
const displayName = ref(props.user.display_name);
const status = ref(props.user.status);
const avatar = ref<string | null | undefined>(undefined);
const validation = ref("");
const previewUser = computed(() => ({
  ...props.user,
  display_name: displayName.value || props.user.display_name,
  avatar_path:
    avatar.value === undefined ? props.user.avatar_path : avatar.value,
}));
function selectAvatar(event: Event) {
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
    validation.value = "Выберите изображение PNG, JPEG, WebP или GIF до 2 МБ.";
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
    displayName: displayName.value.trim(),
    status: status.value.trim(),
    ...(avatar.value === undefined ? {} : { avatar: avatar.value }),
  });
}
</script>
<template>
  <ModalDialog label="Мой профиль" @close="!busy && emit('close')">
    <section class="profile-card">
      <header class="dialog-header">
        <h2>Мой профиль</h2>
        <button
          class="close-button"
          aria-label="Закрыть профиль"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <nav class="profile-tabs" aria-label="Настройки профиля">
        <button
          type="button"
          :class="{ selected: tab === 'profile' }"
          :disabled="busy"
          @click="selectTab('profile')"
        >
          Профиль
        </button>
        <button
          type="button"
          :class="{ selected: tab === 'appearance' }"
          :disabled="busy"
          @click="selectTab('appearance')"
        >
          Внешний вид
        </button>
      </nav>
      <AppearanceSettings
        v-if="tab === 'appearance'"
        :value="appearanceValue ?? user.appearance"
        :status="appearanceStatus"
        :error="appearanceError"
        @change="emit('changeAppearance', $event)"
        @retry="emit('flushAppearance')"
      />
      <div v-show="tab === 'profile'" class="profile-avatar">
        <UserAvatar :user="previewUser" /><label class="text-button"
          >Изменить фото<input
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :disabled="busy"
            @change="selectAvatar" /></label
        ><button
          v-if="previewUser.avatar_path"
          class="text-button danger"
          type="button"
          :disabled="busy"
          @click="avatar = null"
        >
          Удалить фото
        </button>
      </div>
      <form
        v-show="tab === 'profile'"
        class="account-form"
        @submit.prevent="submit"
      >
        <label
          >Имя<input
            v-model="displayName"
            required
            maxlength="40"
            :disabled="busy"
        /></label>
        <label
          >О себе<textarea
            v-model="status"
            maxlength="160"
            rows="3"
            placeholder="Несколько слов о вас"
            :disabled="busy"
          /><small class="muted">{{ status.length }} / 160</small></label
        >
        <div class="profile-username">
          <span class="muted">Логин</span><strong>@{{ user.username }}</strong>
        </div>
        <p v-if="validation || error" class="form-error" role="alert">
          {{ validation || error }}
        </p>
        <footer class="profile-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="busy"
            @click="emit('close')"
          >
            Отмена</button
          ><button
            class="primary-button"
            :disabled="busy || !displayName.trim()"
          >
            {{ busy ? "Сохранение…" : "Сохранить" }}
          </button>
        </footer>
      </form>
    </section>
  </ModalDialog>
</template>
