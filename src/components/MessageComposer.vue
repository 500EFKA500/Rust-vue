<script setup lang="ts">
import fileicon from "../assets/file.png"
import emojeicon from "../assets/emoje.png"
import {
  open
} from "@tauri-apps/plugin-dialog";

// defineEmits сообщает vue какиеиз событий данный компонент в праве рассылать
const emit = defineEmits<{
  send: [body:string];
  "toggle-emoji": [];
  "update:modelValue": [value: string];
  image: [filePath: string]
}>();
const props = defineProps<{
  modelValue: string
}>()


function updateDraft(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value)
}

// функция отправки нового соо
function submitMessage(){
  const body = props.modelValue.trim();

  if(!body) return;

  emit("send", body)

  // отчистка поля после отправки
  emit("update:modelValue", "");
}

async function addFile() {
  // open - Открывает системный выбор файла
  const file = await open({
    multiple:false, // Запрещает выбрать несколько файлов

    filters:[
      {
        name:"Images",

        extensions:[
          "png",
          "jpg",
          "jpeg",
          "webp"
        ]
      }
    ]
  });
  
  if (typeof file !== "string") return

  emit("image", file)
}
function openEmoji() {
  emit("toggle-emoji")
}

</script>

<template>

  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <button
        type="button"
        class="file-button"
        @click="addFile"
    >
      <img
          :src="fileicon"
          alt=""
          class="file-icon"
      />
    </button>
    <input
        :value="modelValue"
        @input="updateDraft"
        type="text"
        placeholder="Напишите что-то"
        autocomplete="off"
    />
    <button
        type="button"
        class="emoji-button"
        @click="openEmoji"
    >
      <img
          :src="emojeicon"
          alt=""
          class="emoji-icon"
      />
    </button>
    <button type="submit">Отправить</button>
  </form>

</template>

<style scoped>
.composer{
  display: flex;
  position: sticky;
  bottom: 0;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #252830;
  background: #17191f;
  flex-shrink: 0;
}
.emoji-button {
  padding: 0 18px;
  width: 44px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;

  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}

.file-button {
  padding: 0 18px;
  width: 44px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: white;
  background: #386be0;
  font: inherit;
  font-weight: 600;

  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}

.composer input{
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #343842;
  border-radius: 7px;
  color: #f2f3f5;
  background: #20232a;
  font: inherit;
}

.composer input:focus{
  border-color: #4f7fa4;
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

</style>
