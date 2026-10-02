<script setup lang="ts">
import {ref} from "vue";

import { open } from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

// defineEmits - сообщает vue, какие из событий, данный
// компонент имеет право рассылать
const emit = defineEmits<{
  send: [body:string];
  sendImage: [path:string];
}>();

const draft = ref("");

function submitMessage(){
  // Взять введенный пользователем текст и убрать проблемы по краям
  const body = draft.value.trim();

  if(!body) return;

  emit("send", body);

  // После отправки очищаем поле ввода
  draft.value = "";
}

async function selectImage(){
  const file = await open({
    multiple: false,

    filters:[
      {
        name:"Image",
        extensions:[
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif"
        ]
      }
    ]
  });

  console.log(file)

  if(!file){
    return;
  }

  const savedPath =
      await invoke<string>(
          "save_attachment",
          {
            source:file
          }
      );

  // console.log(savedPath)

  emit(
      "sendImage",
      savedPath
  )

}
</script>

<template>
  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <button
      type="button"
      class="image-button"
      @click="selectImage"
    >
      📎
    </button>
    <input
        v-model="draft"
        type="text"
        placeholder="Ну пиши уже че нить"
        autocomplete="off"
    />
    <button type="submit">Отправить</button>
  </form>
</template>

<style scoped>

.image-button{
  width: 42px;
  height: 42px;
  border: 1px solid #343842;
  border-radius: 8px;
  background: #20232a;
  cursor: pointer;
  font-size: 18px;
}

.image-button:hover{
  background: #292c34;
}
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

</style>