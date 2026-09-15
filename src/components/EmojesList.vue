<script setup lang="ts">
import {Emojes} from "../types/emojes.ts";
import { ref } from "vue"

const emojes: Emojes[] = [
  {id: 1, emoje: "👍"},
  {id: 2, emoje: "💽"}
];
const activeTab = ref<"emoji" | "gif" | "gif-emoji">("emoji")
const gifs = [
  { id: 1, src: "/gifs/0_0.gif" },
];
// GIF-смайлики добавляются в public/smiles и отправляются как изображения,
// как и обычные GIF из вкладки выше.
const gifEmojis = [
  { id: 1, src: "/gifs/0_0.gif" },
];

const emit = defineEmits<{
  select: [emoji: string]
  image: [filePath: string]
}>()
function selectEmoji(emoji: string) {
  emit("select", emoji)
}
function selectGif(src: string) {
  emit("image", src)
}

</script>

<template>
  <div class="emoji-window">
    <div class="tabs">
      <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'emoji' }"
          @click="activeTab = 'emoji'"
      >
        Смайлики
      </button>

      <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'gif' }"
          @click="activeTab = 'gif'"
      >
        GIF
      </button>

      <button
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': activeTab === 'gif-emoji' }"
          @click="activeTab = 'gif-emoji'"
      >
        Смайлики
      </button>
    </div>

    <div v-if="activeTab === 'emoji'" class="emoji-grid">
      <button
          v-for="emoji in emojes"
          :key="emoji.id"
          type="button"
          class="emoji-button"
          @click="selectEmoji(emoji.emoje)"
      >
        {{ emoji.emoje }}
      </button>
    </div>

    <div v-else-if="activeTab === 'gif'" class="gif-grid">
      <button
          v-for="gif in gifs"
          :key="gif.id"
          type="button"
          class="gif-button"
          @click="selectGif(gif.src)"
      >
        <img :src="gif.src" alt="" class="gif-preview" />
      </button>
    </div>

    <div v-else class="gif-grid">
      <button
          v-for="gifEmoji in gifEmojis"
          :key="gifEmoji.id"
          type="button"
          class="gif-button"
          @click="selectGif(gifEmoji.src)"
      >
        <img :src="gifEmoji.src" alt="GIF-смайлик" class="gif-preview" />
      </button>
    </div>
  </div>
</template>

<style scoped>

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  color: #b7becd;
  background: #2a2e37;
  font: inherit;
}

.tab-button--active {
  color: white;
  background: #386be0;
}

.emoji-grid {
  display: grid;
  gap: 6px;
}

.emoji-button {
  padding: 7px 3px;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  font-size: 23px;
  background: transparent;
}

.emoji-button:hover,
.gif-button:hover {
  background: #343a46;
}

.gif-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.gif-button {
  overflow: hidden;
  height: 90px;
  padding: 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #2a2e37;
}

.gif-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
