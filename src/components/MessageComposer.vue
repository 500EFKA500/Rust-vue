<script setup lang="ts">
import {ref} from "vue";
import fileicon from "../assets/file.png";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

// defineEmits - сообщает vue, какие из событий, данный
// компонент имеет право рассылать
const emit = defineEmits<{
  send: [body:string];
  image: [filePath: string];
}>();

const draft = ref("");
const attachmentError = ref("");

function submitMessage(){
  // Взять введенный пользователем текст и убрать проблемы по краям
  const body = draft.value.trim();

  if(!body) return;

  emit("send", body);

  // После отправки очищаем поле ввода
  draft.value = "";
}

async function addFile() {
  attachmentError.value = "";

  const source = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Изображения", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
  });

  if (!source || Array.isArray(source)) return;

  try {
    const savedPath = await invoke<string>("save_attachment", { source });
    emit("image", savedPath);
  } catch (error) {
    console.error(error);
    attachmentError.value = "Не удалось прикрепить изображение";
  }
}
</script>

<template>
  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <input
        v-model="draft"
        type="text"
        placeholder="Ну пиши уже че нить"
        autocomplete="off"
    />
    <button type="button" class="file-button" @click="addFile">
      <img :src="fileicon" alt="Прикрепить файл" class="file-icon" />
    </button>
    <button type="submit">Отправить</button>
  </form>
  <p v-if="attachmentError" class="attachment-error">{{ attachmentError }}</p>
</template>

<style scoped>

.composer{
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
  flex-shrink: 0;
}

.composer input{
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #343842;
  border-radius: 7px;
  outline: none;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}
.composer input:focus{
  border-color: #4f7fea;
}

.composer button{
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;
}

.file-button {
  width: 44px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  display: block;
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.attachment-error {
  margin: 0;
  padding: 0 20px 10px;
  color: #ff9b9b;
  font-size: 12px;
}

</style>
