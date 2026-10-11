<script setup lang="ts">
import { ref } from 'vue';
import type { Channel } from '../types/channel';
defineProps<{ channels: Channel[]; selectedId: number; disabled: boolean }>();
const emit = defineEmits<{ select: [id: number]; create: [name: string, description: string] }>();
const name = ref('');
const description = ref('');
function create() {
  const title = name.value.trim();
  if (!title || title.length > 60 || description.value.trim().length > 200) return;
  emit('create', title, description.value.trim());
}
</script>
<template>
  <aside class="channels">
    <h2>Каналы</h2>
    <nav aria-label="Каналы мессенджера">
      <button v-for="channel in channels" :key="channel.id" :disabled="disabled"
        :aria-pressed="channel.id === selectedId" @click="emit('select', channel.id)">
        # {{ channel.name }}
      </button>
    </nav>
    <form @submit.prevent="create">
      <input v-model="name" aria-label="Название канала" placeholder="Название канала" maxlength="60" required />
      <input v-model="description" aria-label="Описание канала" placeholder="Описание" maxlength="200" />
      <button :disabled="disabled || !name.trim()" type="submit">Создать канал</button>
    </form>
  </aside>
</template>
<style scoped>
.channels { padding: 12px 20px; background: #17191f; border-bottom: 1px solid #343842; }
h2 { font-size: 14px; margin: 0 0 8px; }
nav, form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
button, input { padding: 8px; border: 1px solid #596170; border-radius: 6px; color: #f2f3f5; background: #20232a; }
button[aria-pressed="true"] { background: #386be0; }
button:disabled { opacity: .5; }
</style>
