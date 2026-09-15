<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <div class="chat-info">
    <h2>{{ title }}</h2>
    <p>{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.chat-info {
  padding: 20px 24px;
  border-bottom: 1px solid #8f96a3;
}

.chat-info h2 {
  margin: 0;
  font-size: 16px;
}

.chat-info p {
  margin: 5px 0 0;
  color: #858c98;
  font-size: 13px;
}
</style>
