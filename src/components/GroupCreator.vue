<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import { request } from "../services/api";
import type { User } from "../types/user";
defineProps<{ busy: boolean; error: string }>();
const emit = defineEmits<{
  close: [];
  create: [title: string, memberIds: number[]];
}>();
const title = ref("");
const search = ref("");
const users = ref<User[]>([]);
const selected = ref<User[]>([]);
const searching = ref(false);
const searchError = ref("");
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  const version = ++revision;
  clearTimeout(timer);
  users.value = [];
  searchError.value = "";
  const query = value.trim().replace(/^@/, "");
  searching.value = query.length >= 2;
  if (!searching.value) return;
  timer = setTimeout(async () => {
    try {
      const result = await request<User[]>(
        "/api/users?q=" + encodeURIComponent(query),
      );
      if (version === revision) users.value = result;
    } catch (cause) {
      if (version === revision)
        searchError.value =
          cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (version === revision) searching.value = false;
    }
  }, 250);
});
function toggle(user: User) {
  if (selected.value.some((item) => item.id === user.id))
    selected.value = selected.value.filter((item) => item.id !== user.id);
  else if (selected.value.length < 99) selected.value.push(user);
}
onUnmounted(() => {
  revision++;
  clearTimeout(timer);
});
</script>
<template>
  <ModalDialog label="Новая группа" @close="!busy && emit('close')">
    <section class="profile-card">
      <header class="dialog-header">
        <h2>Новая группа</h2>
        <button
          class="close-button"
          aria-label="Закрыть создание группы"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <form
        class="account-form"
        @submit.prevent="
          emit(
            'create',
            title.trim(),
            selected.map((user) => user.id),
          )
        "
      >
        <label
          >Название группы<input
            v-model="title"
            required
            maxlength="80"
            placeholder="Например, Друзья"
            :disabled="busy"
        /></label>
        <label
          >Участники<input
            v-model="search"
            type="search"
            maxlength="64"
            placeholder="Имя или @логин"
            aria-label="Найти участников группы"
            :disabled="busy"
        /></label>
        <div
          v-if="selected.length"
          class="selected-users"
          aria-label="Выбранные участники"
        >
          <button
            v-for="user in selected"
            :key="user.id"
            type="button"
            :disabled="busy"
            :aria-label="'Убрать участника: ' + user.display_name"
            @click="toggle(user)"
          >
            {{ user.display_name }} <span aria-hidden="true">×</span>
          </button>
        </div>
        <small class="muted"
          >{{ selected.length + 1 }} / 100 · Вы будете создателем группы</small
        >
        <div class="member-results">
          <p v-if="searching" class="muted" role="status">Поиск…</p>
          <p
            v-else-if="
              search.trim().length >= 2 && !users.length && !searchError
            "
            class="muted"
          >
            Никого не найдено
          </p>
          <button
            v-for="user in users"
            :key="user.id"
            class="account-row"
            type="button"
            :disabled="
              busy ||
              (selected.length >= 99 &&
                !selected.some((item) => item.id === user.id))
            "
            :aria-pressed="selected.some((item) => item.id === user.id)"
            :aria-label="
              'Участник: ' + user.display_name + ' @' + user.username
            "
            @click="toggle(user)"
          >
            <UserAvatar :user="user" /><span
              ><strong>{{ user.display_name }}</strong
              ><small>@{{ user.username }}</small></span
            ><span
              v-if="selected.some((item) => item.id === user.id)"
              class="account-check"
              >✓</span
            >
          </button>
        </div>
        <p v-if="error || searchError" class="form-error" role="alert">
          {{ error || searchError }}
        </p>
        <button
          class="primary-button"
          :disabled="busy || !title.trim() || !selected.length"
        >
          {{ busy ? "Создание…" : "Создать группу" }}
        </button>
      </form>
    </section>
  </ModalDialog>
</template>
<style scoped>
.selected-users {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.selected-users button {
  padding: 6px 10px;
  border: 0;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--accent-link);
  font: inherit;
  font-size: 12px;
}
.member-results {
  max-height: 240px;
  overflow-y: auto;
}
</style>
