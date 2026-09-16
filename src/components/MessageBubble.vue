<script setup lang="ts">

import type { Message } from "../types/message.ts";
import { convertFileSrc } from "@tauri-apps/api/core";
import { computed } from "vue";

const props = defineProps<{
  message: Message;
  isOwn: boolean;
}>();

const imageUrl = computed(() => {
  if (!props.message.image_path) return null;
  return convertFileSrc(props.message.image_path);
});
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

</style>
