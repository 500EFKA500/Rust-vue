<script setup lang="ts">
import {Emojes} from "../types/emojes.ts";

const like: Emojes = {
  id: 1,
  emoje: "👍"
}
const dislike: Emojes = {
  id: 2,
  emoje: "💽"
}
const emojes: Emojes[] = [
  like,
  dislike
];

const emit = defineEmits<{
  select: [emoji: string]
}>()
function selectEmoji(emoji: string) {
  emit("select", emoji)
}

</script>

<template>
  <div class="emoji-window">
    <button
        v-for="emoji in emojes"
        :key="emoji.id"
        type="button"
        class="emoji-button"
        @click="selectEmoji(emoji.emoje)"
    >
      {{ emoji.emoje }}
    </button>
  </div>
</template>

<style scoped>

</style>
