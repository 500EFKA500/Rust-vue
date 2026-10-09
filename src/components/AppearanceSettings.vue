<script setup lang="ts">
import { ref, watch } from "vue";
import { defaultAppearance, type Appearance } from "../types/appearance";
const props = defineProps<{
  value?: Appearance;
  status: string;
  error: string;
}>();
const emit = defineEmits<{
  change: [appearance: Appearance];
  retry: [];
}>();
const settings = ref<Appearance>({ ...(props.value ?? defaultAppearance) });
const themes = [
  { value: "light", label: "Светлая", symbol: "☀" },
  { value: "dark", label: "Тёмная", symbol: "☾" },
  { value: "system", label: "Системная", symbol: "◐" },
] as const;
const accents = [
  { value: "blue", label: "Синий", color: "#386be0" },
  { value: "purple", label: "Фиолетовый", color: "#8455d5" },
  { value: "green", label: "Зелёный", color: "#258354" },
  { value: "orange", label: "Оранжевый", color: "#b65a19" },
  { value: "pink", label: "Розовый", color: "#c3417c" },
] as const;
watch(settings, (value) => emit("change", { ...value }), { deep: true });
</script>
<template>
  <section class="appearance-settings">
    <fieldset>
      <legend>Тема</legend>
      <div class="theme-options">
        <label
          v-for="theme in themes"
          :key="theme.value"
          :class="{ selected: settings.theme === theme.value }"
          ><input
            v-model="settings.theme"
            type="radio"
            name="theme"
            :value="theme.value"
          /><span aria-hidden="true">{{ theme.symbol }}</span
          >{{ theme.label }}</label
        >
      </div>
    </fieldset>
    <fieldset>
      <legend>Цвет акцента</legend>
      <div class="accent-options">
        <label
          v-for="accent in accents"
          :key="accent.value"
          :title="accent.label"
          :style="{ '--swatch': accent.color }"
          :class="{ selected: settings.accent === accent.value }"
          ><input
            v-model="settings.accent"
            type="radio"
            name="accent"
            :value="accent.value"
            :aria-label="accent.label"
          /><span aria-hidden="true">{{
            settings.accent === accent.value ? "✓" : ""
          }}</span></label
        >
      </div>
    </fieldset>
    <label class="size-setting"
      >Размер текста <output>{{ settings.fontSize }} px</output
      ><input
        v-model.number="settings.fontSize"
        type="range"
        min="12"
        max="20"
        step="1"
        aria-label="Размер текста"
    /></label>
    <fieldset>
      <legend>Фон переписки</legend>
      <div class="background-options">
        <label
          ><input
            v-model="settings.background"
            type="radio"
            name="background"
            value="plain"
          />Однотонный</label
        ><label
          ><input
            v-model="settings.background"
            type="radio"
            name="background"
            value="dots"
          />Точки</label
        ><label
          ><input
            v-model="settings.background"
            type="radio"
            name="background"
            value="gradient"
          />Градиент</label
        >
      </div>
    </fieldset>
    <label class="compact-setting"
      ><input v-model="settings.compact" type="checkbox" />Компактный список
      чатов</label
    >
    <div class="appearance-preview" aria-label="Предпросмотр переписки">
      <span>Так выглядит ваш чат</span
      ><span>Настройки только для этого аккаунта</span>
    </div>
    <p v-if="error" class="form-error" role="alert">
      {{ error }}
    </p>
    <p class="muted autosave-status" role="status" aria-live="polite">
      {{ status }}
    </p>
    <button
      v-if="error"
      class="text-button"
      type="button"
      @click="emit('retry')"
    >
      Повторить сохранение
    </button>
  </section>
</template>
<style scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}
.autosave-status {
  margin: 0;
  font-size: 12px;
}
fieldset {
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
legend {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.theme-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.theme-options label {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 12px 4px;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  position: relative;
}
.theme-options span {
  font-size: 24px;
}
.theme-options input,
.accent-options input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.theme-options label:focus-within,
.accent-options label:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.theme-options .selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.accent-options {
  display: flex;
  gap: 16px;
}
.accent-options label {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--swatch);
  color: white;
  cursor: pointer;
}
.accent-options .selected {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
.size-setting {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}
.size-setting output {
  margin-left: auto;
  color: var(--text-muted);
}
.size-setting input {
  width: 100%;
  accent-color: var(--accent);
}
.background-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
}
.background-options input,
.compact-setting input {
  accent-color: var(--accent);
}
.compact-setting {
  font-size: 13px;
}
.appearance-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--chat-background);
  border-radius: 12px;
  font-size: var(--message-font-size);
}
.appearance-preview span {
  align-self: flex-start;
  padding: 10px;
  border-radius: 12px;
  background: var(--bubble-other);
  color: var(--text);
  max-width: 85%;
}
.appearance-preview span:last-child {
  align-self: flex-end;
  color: var(--own-text);
  background: var(--bubble-own);
}
</style>
