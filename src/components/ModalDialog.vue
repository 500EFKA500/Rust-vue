<script setup lang="ts">
import { onMounted, ref } from "vue";
defineProps<{ label: string; drawer?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
</script>
<template>
  <dialog
    ref="dialog"
    class="account-dialog"
    :class="{ 'account-dialog--drawer': drawer }"
    :aria-label="label"
    @cancel.prevent="emit('close')"
    @click="
      (event) => {
        if (event.target === dialog) emit('close');
      }
    "
  >
    <slot />
  </dialog>
</template>
