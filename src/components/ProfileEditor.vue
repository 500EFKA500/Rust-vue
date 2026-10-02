<script setup lang="ts">
import { ref } from "vue";

import type{
  ProfileUpdate,
  User,
} from "../types/user";

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  save: [
    profile: ProfileUpdate
  ];
  close: [];
}>();

const displayName = ref(props.user.display_name,);
const userStatus = ref (props.user.status,);
function submitProfile(){
  const cleanDisplayName =
      displayName.value.trim();

  if (!cleanDisplayName){
    return;
  }

  emit(
      "save",
      {
        displayName: cleanDisplayName,
        status: userStatus.value.trim(),
      },
  );
}
</script>

<template>
  <div class="progile_backdrop">
    <section class="profile-card">
      <header class="profile-card__header">
        <h2>
          Профиль
        </h2>
        <button
            type="button"
            class="profile-card__close"
            @click="emit('close')"
        >
          x
        </button>
      </header>
      <form
          class="profile-form"
          @submit.prevent="submitProfile"
      >
        <label
            for="profile-form"
            @submit.prevent="submitProfile"
        >
        <span>
          Отображаемое имя
        </span>
          <input
              id="profile-display-name"
              v-model="displayName"
              type="text"
              maxlength="40"
          >
        </label>
        <label
            for="profile-status"
            class="profile-field"
        >
          <span>
            Статус
          </span>
          <textarea
            id="profile-status"
            v-model="userStatus"
            maxlength="120"
            rows="3"
          ></textarea>
        </label>
        <div class="profile-username">
          <span>
            username
          </span>
          <strong>
            @{{ user.username }}
          </strong>
        </div>
        <footer class="profile-actions">
          <button
            type="button"
            class="profile-button profile-button--secondary"
            @click="emit('close')"
          >
            Отмена
          </button>
          <button
            type="submit"
            class="profile-button profile-button--primary"
          >
            Сохранить
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>

</style>