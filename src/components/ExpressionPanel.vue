<script setup lang="ts">
import { computed, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import smileIcon from "../assets/icons/smile.svg?raw";
import { emojiGroups, categoryIcons } from "../data/emoji";
import { stickers, builtInGifs } from "../data/media";
import { getFileUrl } from "../types/file";
import type { MediaItem, ExpressionTab } from "../types/media";

const emit = defineEmits<{
  emoji: [value: string];
  sendImage: [path: string];
  close: [];
}>();

const tab = ref<ExpressionTab>("emoji");
const tabs = [
  { id: "emoji", label: "Эмодзи" },
  { id: "stickers", label: "Стикеры" },
  { id: "gif", label: "GIF" },
] as const;

const search = ref("");
const error = ref("");
const importing = ref(false);
const category = ref(0);
const recentEmoji = ref<string[]>([]);
const customGifs = ref<MediaItem[]>([]);

function loadRecentEmoji() {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("desiremes-recent-emoji") ?? "[]",
    );
    if (Array.isArray(saved)) {
      recentEmoji.value = saved.filter((item) => typeof item === "string").slice(0, 32);
    }
  } catch {
    recentEmoji.value = [];
  }
}

function loadCustomGifs() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem("desiremes-gifs") ?? "[]");
    if (Array.isArray(saved)) {
      customGifs.value = saved.filter(
        (item) => typeof item?.name === "string" && typeof item?.path === "string",
      );
    }
  } catch {
    customGifs.value = [];
  }
}

loadRecentEmoji();
loadCustomGifs();

const shownEmoji = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (query) {
    const matchingGroups = emojiGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.items.some((emoji) => emoji.includes(query)),
    );
    return [...new Set(matchingGroups.flatMap((group) => group.items))];
  }
  if (category.value === -1) {
    return recentEmoji.value;
  }
  return [...new Set(emojiGroups[category.value]?.items ?? [])];
});

const shownStickers = computed(() =>
  stickers.filter((item) =>
    item.name.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
);

const shownGifs = computed(() =>
  [...builtInGifs, ...customGifs.value].filter((item) =>
    item.name.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
);

function selectTab(value: ExpressionTab) {
  tab.value = value;
  search.value = "";
  error.value = "";
}

function selectCategory(index: number) {
  category.value = index;
  search.value = "";
}

function selectEmoji(emoji: string) {
  recentEmoji.value = [
    emoji,
    ...recentEmoji.value.filter((item) => item !== emoji),
  ].slice(0, 32);
  try {
    localStorage.setItem("desiremes-recent-emoji", JSON.stringify(recentEmoji.value));
  } catch {
    // При заполненном хранилище эмодзи всё равно можно отправить.
  }
  emit("emoji", emoji);
}

function sendMedia(path: string) {
  emit("sendImage", path);
}

async function addGif() {
  error.value = "";
  importing.value = true;
  try {
    const file = await open({
      multiple: false,
      filters: [{ name: "GIF", extensions: ["gif"] }],
    });
    if (!file || Array.isArray(file)) {
      return;
    }
    const savedPath = await invoke<string>("save_attachment", { source: file });
    customGifs.value.push({
      name: file.split(/[\\/]/).pop() ?? "Моя GIF",
      path: savedPath,
    });
    localStorage.setItem("desiremes-gifs", JSON.stringify(customGifs.value));
  } catch (cause) {
    error.value = "Не удалось добавить GIF: " + String(cause);
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <section
    id="expression-panel"
    class="expression-panel"
    aria-label="Эмодзи, стикеры и GIF"
  >
    <header class="panel-header">
      <div
        class="tabs"
        role="tablist"
        aria-label="Разделы"
      >
        <button
          v-for="item in tabs"
          :key="item.id"
          :id="'tab-' + item.id"
          type="button"
          role="tab"
          :aria-label="item.label"
          :title="item.label"
          :aria-selected="tab === item.id"
          :class="{ selected: tab === item.id }"
          @click="selectTab(item.id)"
        >
          <span
            v-if="item.id === 'emoji'"
            class="tab-icon"
            v-html="smileIcon"
          />
          <svg
            v-else-if="item.id === 'stickers'"
            class="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8l-7 7Z" />
            <path d="M14 21v-4a3 3 0 0 1 3-3h4" />
          </svg>
          <span
            v-else
            class="gif-tab"
            >GIF</span
          >
        </button>
      </div>
      <button
        class="close-panel"
        type="button"
        aria-label="Закрыть панель"
        @click="emit('close')"
      >
        ×
      </button>
    </header>
    <div class="search-row">
      <svg
        class="search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <circle
          cx="10"
          cy="10"
          r="6"
        />
        <path d="m15 15 5 5" />
      </svg>
      <input
        v-model="search"
        type="search"
        placeholder="Поиск"
        aria-label="Поиск"
      />
      <button
        v-if="tab === 'gif'"
        class="add-gif"
        type="button"
        title="Добавить GIF"
        aria-label="Добавить GIF"
        :disabled="importing"
        @click="addGif"
      >
        +
      </button>
    </div>
    <div
      class="panel-content"
      role="tabpanel"
      :aria-labelledby="'tab-' + tab"
    >
      <template v-if="tab === 'emoji'">
        <div class="emoji-grid">
          <button
            v-for="emoji in shownEmoji"
            :key="emoji"
            type="button"
            :aria-label="'Вставить ' + emoji"
            @mousedown.prevent
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
        <p
          v-if="!shownEmoji.length"
          class="empty"
        >
          {{ category === -1 && !search ? "Пока пусто" : "Ничего не найдено" }}
        </p>
      </template>
      <template v-else-if="tab === 'stickers'">
        <div class="sticker-grid">
          <button
            v-for="sticker in shownStickers"
            :key="sticker.path"
            type="button"
            :aria-label="'Отправить стикер: ' + sticker.name"
            @click="sendMedia(sticker.path)"
          >
            <img
              :src="sticker.path"
              :alt="sticker.name"
            />
          </button>
        </div>
        <p
          v-if="!shownStickers.length"
          class="empty"
        >
          Стикеры не найдены
        </p>
      </template>
      <template v-else>
        <div class="gif-grid">
          <button
            v-for="gif in shownGifs"
            :key="gif.path"
            type="button"
            :aria-label="'Отправить GIF: ' + gif.name"
            @click="sendMedia(gif.path)"
          >
            <img
              :src="getFileUrl(gif.path)"
              :alt="gif.name"
              loading="lazy"
            />
          </button>
        </div>
        <p
          v-if="!shownGifs.length"
          class="empty"
        >
          Ничего не найдено
        </p>
      </template>
    </div>
    <nav
      v-if="tab === 'emoji'"
      class="categories"
      aria-label="Категории эмодзи"
    >
      <button
        type="button"
        :class="{ selected: category === -1 }"
        aria-label="Недавние"
        title="Недавние"
        @click="selectCategory(-1)"
      >
        ◷
      </button>
      <button
        v-for="(group, i) in emojiGroups"
        :key="group.name"
        type="button"
        :class="{ selected: category === i }"
        :aria-label="group.name"
        :title="group.name"
        @click="selectCategory(i)"
      >
        {{ categoryIcons[i] }}
      </button>
    </nav>
    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
button {
  cursor: pointer;
  font: inherit;
}
button:focus-visible {
  outline: 2px solid var(--accent-link);
  outline-offset: -2px;
}
button:disabled {
  cursor: default;
  opacity: 0.5;
}
.expression-panel {
  height: min(320px, 45vh);
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
}
.tabs {
  display: flex;
  gap: 6px;
}
.tabs button {
  display: grid;
  place-items: center;
  width: 60px;
  height: 43px;
  padding: 0 12px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
}
.tab-icon {
  width: 22px;
  height: 22px;
}
.tab-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
.gif-tab {
  font-size: 12px;
  font-weight: 700;
  border: 1.5px solid currentColor;
  padding: 1px 3px;
  border-radius: 4px;
}
.tabs .selected {
  color: var(--accent-link);
  border-bottom-color: var(--accent-link);
}
.close-panel {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  font-size: 25px;
}
.panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-muted) transparent;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 3px;
  margin-bottom: 16px;
}
.emoji-grid button {
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 25px;
}
.emoji-grid button:hover,
.sticker-grid button:hover {
  background: var(--hover);
}
.sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
  gap: 10px;
}
.sticker-grid button {
  padding: 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
}
.sticker-grid img {
  width: 100%;
  height: 100px;
  object-fit: contain;
}
.search-row {
  display: flex;
  position: relative;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 0;
}
.search-icon {
  position: absolute;
  left: 22px;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-row input {
  min-width: 0;
  flex: 1;
  background: var(--field);
  color: var(--text);
  padding: 8px 10px 8px 34px;
  border: 0;
  border-radius: 18px;
  outline: none;
}
.search-row input:focus {
  box-shadow: inset 0 0 0 1px var(--accent);
}
.search-row button {
  border: 0;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent-link);
  font-size: 12px;
}
.gif-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.gif-grid button {
  position: relative;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 9px;
  background: var(--field);
}
.gif-grid img {
  width: 100%;
  height: 105px;
  display: block;
  object-fit: contain;
}
.gif-grid button:hover {
  box-shadow: inset 0 0 0 2px var(--accent-link);
}
.search-row .add-gif {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  font-size: 26px;
  flex-shrink: 0;
}
.categories {
  display: flex;
  justify-content: space-around;
  padding: 4px 6px;
  border-top: 1px solid var(--border);
}
.categories button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-size: 20px;
}
.categories .selected,
.categories button:hover {
  color: var(--accent-link);
  background: var(--accent-soft);
}
.error {
  padding: 8px 16px;
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
.empty {
  color: var(--text-muted);
  font-size: 13px;
}
@media (max-width: 620px) {
  .gif-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
