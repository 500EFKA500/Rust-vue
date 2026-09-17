<script setup lang="ts">

import type { Message} from "../types/messages.ts";
import { convertFileSrc } from "@tauri-apps/api/core";

defineProps<{
  message: Message;
  isOwn: boolean
}>();

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function isImage(path: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(path);
}

function fileSource(path: string) {
  return convertFileSrc(path);
}
</script>

<template>
  <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
      }"
  >
    <p v-if="message.body">
      {{message.body}}
    </p>
    <a
        v-if="message.image_path && !isImage(message.image_path)"
        class="message__file"
        :href="fileSource(message.image_path)"
        target="_blank"
        rel="noopener"
    >{{ fileName(message.image_path) }}</a>
    <img
        v-if="message.image_path && isImage(message.image_path)"
        class="message__image"
        :src="fileSource(message.image_path)"
        :alt="fileName(message.image_path)"
    />
    <footer>
            <span>
              {{message.author}}
            </span>
      <span>
              |
            </span>
      <span>
              {{message.created_at}}
            </span>
    </footer>
  </article>
</template>

<style scoped>

.message{
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message--own{
  align-self: flex-end;
  background: #386be0;
}
.message--other{
  align-self: flex-start;
  background: #8694b8;
}

.message p{
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message__file{
  color: inherit;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.message__image{
  display: block;
  max-width: 100%;
  max-height: 260px;
  margin-top: 8px;
  border-radius: 6px;
  object-fit: contain;
}

.message footer{
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}
</style>
