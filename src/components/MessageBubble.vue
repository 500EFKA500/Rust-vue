<script setup lang="ts">

import type { Message } from "../types/message.ts";
import { invoke } from "@tauri-apps/api/core";
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  message: Message;
  isOwn: boolean;
}>();

const imageUrl = ref<string | null>(null);
const attachmentError = ref(false);

function revokeImageUrl() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = null;
}

function imageMimeType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension ?? "png"}`;
}

async function loadAttachment(path: string | null) {
  revokeImageUrl();
  attachmentError.value = false;
  if (!path) return;

  try {
    const bytes = await invoke<number[]>("read_attachment", { path });
    const blob = new Blob([new Uint8Array(bytes)], { type: imageMimeType(path) });
    imageUrl.value = URL.createObjectURL(blob);
  } catch (error) {
    console.error(error);
    attachmentError.value = true;
  }
}

watch(() => props.message.image_path, loadAttachment, { immediate: true });
onBeforeUnmount(revokeImageUrl);
</script>

<template>
  <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
      }"
  >
    <img v-if="imageUrl" :src="imageUrl" alt="Вложение" class="message-image" />
    <p v-else-if="attachmentError" class="attachment-error">Не удалось открыть вложение</p>
    <p v-if="message.body">
      {{message.body}}
    </p>
    <footer>
            <span>
              {{ message.author}}
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
  background: #252830;
}

.message p{
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer{
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #b5bbc7;
  font-size: 10px;
}

.message-image {
  display: block;
  max-width: 280px;
  max-height: 280px;
  border-radius: 8px;
  object-fit: contain;
}

.attachment-error {
  margin: 0;
}

</style>
