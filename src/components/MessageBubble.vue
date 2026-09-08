<script setup lang="ts">

import type { Message} from "../types/messages.ts";

defineProps<{
  message: Message;
}>();
</script>

<template>
  <article class="message">
    <p>
      {{message.body}}
    </p>
    <footer>
            <span>
              {{message.author}}
            </span>
      <span>
              |
            </span>
      <span>
              {{message.created_at}}
            </span>
    </footer>
  </article>
</template>

<style scoped>

.message{
  align-self: flex-end;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #8f96a3;
}

.message p{
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer{
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: #ccd8f7;
  font-size: 10px;
}
</style>