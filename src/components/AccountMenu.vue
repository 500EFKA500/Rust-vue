<script setup lang="ts">
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import type { User } from "../types/user";
defineProps<{ user: User; accounts: User[]; busy: boolean; status: string }>();
const emit = defineEmits<{
  close: [];
  select: [user: User];
  add: [];
  profile: [];
  appearance: [];
  logout: [];
  group: [];
  channel: [];
}>();
</script>
<template>
  <ModalDialog drawer label="Меню аккаунтов" @close="emit('close')">
    <section class="account-menu">
      <header class="menu-profile">
        <button
          class="close-button"
          aria-label="Закрыть меню"
          @click="emit('close')"
        >
          ×
        </button>
        <UserAvatar :user="user" />
        <h2>{{ user.display_name }}</h2>
        <span class="muted">@{{ user.username }}</span>
        <p v-if="user.status">{{ user.status }}</p>
      </header>
      <div class="account-list" aria-label="Активные аккаунты">
        <button
          v-for="account in accounts"
          :key="account.id"
          class="account-row"
          :class="{ selected: account.id === user.id }"
          :disabled="busy"
          :aria-current="account.id === user.id ? 'true' : undefined"
          @click="emit('select', account)"
        >
          <UserAvatar :user="account" /><span
            ><strong>{{ account.display_name }}</strong
            ><small>@{{ account.username }}</small></span
          ><span v-if="account.id === user.id" class="account-check">✓</span>
        </button>
      </div>
      <nav class="menu-actions">
        <button :disabled="busy" @click="emit('channel')">
          <span aria-hidden="true">＋</span>Создать канал
        </button>
        <button :disabled="busy" @click="emit('group')">
          <span aria-hidden="true">＋</span>Создать группу
        </button>
        <button :disabled="busy" @click="emit('appearance')">
          <span aria-hidden="true">◐</span>Внешний вид
        </button>
        <button :disabled="busy" @click="emit('add')">
          <span aria-hidden="true">＋</span>Добавить аккаунт
        </button>
        <button :disabled="busy" @click="emit('profile')">
          <span aria-hidden="true">⚙</span>Мой профиль
        </button>
        <button class="danger" :disabled="busy" @click="emit('logout')">
          <span aria-hidden="true">↪</span>Выйти из аккаунта
        </button>
      </nav>
      <p class="menu-note muted">
        Выход завершит сессию этого аккаунта на устройстве.
      </p>
      <p class="menu-note muted">DesireMes · {{ status }}</p>
    </section>
  </ModalDialog>
</template>
