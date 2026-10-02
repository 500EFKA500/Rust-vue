<script setup lang="ts">
import { getFileUrl } from "../types/file.ts";
import type { Message } from "../types/message.ts";
import { ref } from "vue";

defineProps<{
  message: Message;
  isOwn: boolean;
  close?: false;
}>();

const isImgOpen = ref(false)

const openModal = () => { isImgOpen.value = true }
const closeModal = () => { isImgOpen.value = false }
</script>

<template>
  <article
      class="message"
      :class="{
        'message--own': isOwn,
        'message--other': !isOwn,
      }"
  >
    <p v-if="message.type === 'text'">
      {{ message.body }}
    </p>

    <img
        v-if="message.type === 'image' && message.attachment"
        class="message-image"
        :src="getFileUrl(message.attachment)"
        @click="openModal"
        alt="Превью"
    />

    <div
        v-if="isImgOpen && message.attachment"
        class="modal-overlay"
        @click.self="closeModal"
    >
      <div class="modal-content">
        <img
            class="modal-image"
            :src="getFileUrl(message.attachment)"
            alt="Увеличенное изображение"
        />
      </div>
    </div>


    <footer>
      <span>{{ message.author_name }}</span>
      <span>|</span>
      <span>{{ message.created_at }}</span>
    </footer>
  </article>
</template>

<style scoped>

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.modal-image {
  display: block;
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
  cursor: pointer;
}

.message {
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message--own {
  align-self: flex-end;
  background: #386be0;
}
.message--other {
  align-self: flex-start;
  background: #252830;
}

.message p {
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #b5bbc7;
  font-size: 10px;
}
</style>
