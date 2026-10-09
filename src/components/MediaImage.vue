<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { loadProtectedImage } from "../services/api";
import { getFileUrl } from "../types/file";
const props = defineProps<{ path: string; alt?: string }>();
const source = ref("");
const failed = ref(false);
let revision = 0;
function release() {
  if (source.value.startsWith("blob:")) URL.revokeObjectURL(source.value);
}
watch(
  () => props.path,
  async (path) => {
    const current = ++revision;
    release();
    source.value = "";
    failed.value = false;
    try {
      const value = path.startsWith("data:image/")
        ? path
        : path.startsWith("/api/uploads/")
          ? await loadProtectedImage(path)
          : getFileUrl(path);
      if (current !== revision) {
        if (value.startsWith("blob:")) URL.revokeObjectURL(value);
        return;
      }
      source.value = value;
    } catch {
      if (current === revision) failed.value = true;
    }
  },
  { immediate: true },
);
onUnmounted(() => {
  revision++;
  release();
});
</script>
<template>
  <img
    v-if="source"
    :src="source"
    :alt="alt || 'Изображение'"
  />
  <span
    v-else-if="failed"
    class="media-error"
    role="status"
    >Изображение недоступно</span
  >
  <span
    v-else
    class="media-loading"
    aria-label="Загрузка изображения"
    >…</span
  >
</template>
