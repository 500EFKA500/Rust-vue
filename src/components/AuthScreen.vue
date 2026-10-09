<script setup lang="ts">
import { ref } from "vue";
import type { Credentials } from "../types/account";
defineProps<{ busy: boolean; error: string; adding?: boolean }>();
const emit = defineEmits<{
  submit: [mode: "login" | "register", credentials: Credentials];
  cancel: [];
}>();
const mode = ref<"login" | "register">("login");
const username = ref("");
const password = ref("");
const displayName = ref("");
const repeatPassword = ref("");
const visible = ref(false);
const validation = ref("");
function changeMode() {
  mode.value = mode.value === "login" ? "register" : "login";
  validation.value = "";
  password.value = "";
  repeatPassword.value = "";
}
function submit() {
  validation.value = "";
  if (mode.value === "register" && password.value !== repeatPassword.value) {
    validation.value = "Пароли не совпадают.";
    return;
  }
  emit("submit", mode.value, {
    username: username.value.trim(),
    password: password.value,
    displayName: displayName.value.trim(),
  });
}
</script>
<template>
  <section class="auth-card">
    <button
      v-if="adding"
      class="close-button"
      type="button"
      aria-label="Закрыть"
      :disabled="busy"
      @click="emit('cancel')"
    >
      ×
    </button>
    <div
      class="brand-mark"
      aria-hidden="true"
    >
      ↗
    </div>
    <h1>
      {{
        mode === "login"
          ? adding
            ? "Добавить аккаунт"
            : "Добро пожаловать"
          : "Создать аккаунт"
      }}
    </h1>
    <p class="muted">
      {{ mode === "login" ? "Войдите в DesireMes" : "Ваш профиль в DesireMes" }}
    </p>
    <form
      class="account-form"
      @submit.prevent="submit"
    >
      <label v-if="mode === 'register'"
        >Имя<input
          v-model="displayName"
          required
          maxlength="40"
          autocomplete="name"
          placeholder="Как вас зовут"
          :disabled="busy"
      /></label>
      <label
        >Логин<input
          v-model="username"
          required
          pattern="[a-zA-Z0-9_]{3,32}"
          minlength="3"
          maxlength="32"
          autocomplete="username"
          placeholder="username"
          autocapitalize="none"
          spellcheck="false"
          :disabled="busy"
      /></label>
      <label
        >Пароль
        <span class="password-field"
          ><input
            v-model="password"
            aria-label="Пароль"
            required
            minlength="12"
            maxlength="128"
            :type="visible ? 'text' : 'password'"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :disabled="busy"
          /><button
            type="button"
            :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
            :aria-pressed="visible"
            @click="visible = !visible"
          >
            {{ visible ? "◉" : "◎" }}
          </button></span
        >
      </label>
      <label v-if="mode === 'register'"
        >Повторите пароль<input
          v-model="repeatPassword"
          type="password"
          required
          autocomplete="new-password"
          :disabled="busy"
      /></label>
      <small
        v-if="mode === 'register'"
        class="muted"
        >Логин: латинские буквы, цифры и _. Пароль: минимум 12 символов.</small
      >
      <p
        v-if="validation || error"
        class="form-error"
        role="alert"
      >
        {{ validation || error }}
      </p>
      <button
        class="primary-button"
        :disabled="busy"
      >
        {{ busy ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться" }}
      </button>
    </form>
    <button
      class="text-button"
      type="button"
      :disabled="busy"
      @click="changeMode"
    >
      {{ mode === "login" ? "Создать аккаунт" : "Уже есть аккаунт? Войти" }}
    </button>
    <p class="auth-footnote muted">Серверные аккаунты · история синхронизируется</p>
  </section>
</template>
