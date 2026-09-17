<script setup lang="ts">
// defineEmits сообщает vue какиеиз событий данный компонент в праве рассылать
const emit = defineEmits<{
  send: [body:string];
  attach: [];
  "clear-attachment": [];
  "toggle-emoji": [];
  "update:modelValue": [value: string];
}>();
const props = defineProps<{
  modelValue: string;
  attachmentName: string | null;
}>()

function updateDraft(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value)
}

// функция отправки нового соо
function submitMessage(){
  const body = props.modelValue.trim();

  if(!body && !props.attachmentName) return;

  emit("send", body)

  // отчистка поля после отправки
  emit("update:modelValue", "");
}
function openEmoji() {
  emit("toggle-emoji")
}

function attachFile() {
  emit("attach")
}

function clearAttachment() {
  emit("clear-attachment")
}

</script>

<template>

  <form
      class="composer"
      @submit.prevent="submitMessage"
  >
    <input
        :value="modelValue"
        @input="updateDraft"
        type="text"
        placeholder="Напишите что-то"
        autocomplete="off"
    />
    <button
        type="button"
        @click="openEmoji"
    >Эмодзи</button>
    <button
        type="button"
        @click="attachFile"
    >Файл</button>
    <button type="submit">Отправить</button>
    <span v-if="attachmentName" class="attachment">
      {{ attachmentName }}
      <button type="button" class="attachment__clear" @click="clearAttachment">×</button>
    </span>
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

.attachment{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 8px 10px;
  overflow: hidden;
  border: 1px solid #4f7fa4;
  border-radius: 7px;
  color: #d7e7ff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer .attachment__clear{
  min-width: 24px;
  padding: 0 6px;
  background: #596170;
}

</style>
