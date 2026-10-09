<script setup lang="ts">
import { computed } from "vue";
import MediaImage from "./MediaImage.vue";
import type { User } from "../types/user";
const props = defineProps<{ user: Pick<User, "id" | "display_name" | "avatar_path"> }>();
const initials = computed(() =>
  props.user.display_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase(),
);
</script>
<template>
  <span
    class="avatar"
    :style="{ '--hue': (user.id * 67) % 360 }"
  >
    <MediaImage
      v-if="user.avatar_path"
      :path="user.avatar_path"
      :alt="user.display_name"
    />
    <span v-else>{{ initials }}</span>
  </span>
</template>
<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  background: hsl(var(--hue) 45% 40%);
  color: white;
  font-weight: 600;
}
.avatar :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
