<script setup lang="ts">
import { onMounted, ref } from "vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";
import { request } from "../services/api";
import type { Chat } from "../types/chats";
import type { User } from "../types/user";
const props = defineProps<{ chat: Chat }>();
const emit = defineEmits<{ close: [] }>();
const members = ref<
  (Pick<User, "id" | "username" | "display_name" | "avatar_path"> & {
    is_owner: number;
  })[]
>([]);
const error = ref("");
const loading = ref(true);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    members.value = await request(`/api/chats/${props.chat.id}/members`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <ModalDialog label="Информация о группе" @close="emit('close')">
    <section class="profile-card">
      <header class="dialog-header">
        <h2>{{ chat.title }}</h2>
        <button
          class="close-button"
          aria-label="Закрыть информацию о группе"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <p class="muted">Участники · {{ chat.member_count }}</p>
      <p v-if="loading" role="status" class="muted">Загрузка…</p>
      <p v-if="error" class="form-error" role="alert">
        {{ error }} <button class="text-button" @click="load">Повторить</button>
      </p>
      <div v-for="user in members" :key="user.id" class="account-row">
        <UserAvatar :user="user" /><span
          ><strong>{{ user.display_name }}</strong
          ><small>@{{ user.username }}</small></span
        ><small v-if="user.is_owner" class="muted">Создатель</small>
      </div>
    </section>
  </ModalDialog>
</template>
