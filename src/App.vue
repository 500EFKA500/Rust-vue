<script setup lang="ts">

import type { Message} from "./types/messages.ts";
import Database from "@tauri-apps/plugin-sql"
import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
// импорт 2 фунции из vue
// onMounted - запускает код после появления компонента
// ref -создает быстрое перемещение
import { onMounted, ref } from "vue";
import AppHeader from "./components/AppHeader.vue";

// список соо которые vue отображает в диалоговом экране
const messages = ref<Message[]>([]);

// статус подключения
const status = ref("Подключение...")

// здесь будет подключение к бд
let db: Database | null = null;

// асинхронная функция загрузки соо из sql
async function loadMessages(){
  // если база не подключена прерываем выполнение
  if (!db) return;

  // читаем данные
  messages.value = await db.select<Message[]>(
      "SELECT id, author, body, created_at FROM messages ORDER BY id ASC",
  );
}

async function sendMessage(body: string){
  if (!db) return;

  await db.execute(
      "INSERT INTO messages (author, body) VALUES ($1, $2)",
      ["Вы", body]
  )
  await loadMessages()

}

// VUE выполнит код ниже, когда интерфейс загружен
onMounted(async()=>{
  try{
    // Открываем бд
    db = await Database.load("sqlite:messanger.db");

    // загружаем из базы старые соо
    await loadMessages();

    // показываем успешное соединение
    status.value = "История сохраняется локально";
  } catch (error){
    console.error(error);

    status.value = "Ошибка подключения к базе"
  }
});

</script>

<template>
  <main class="app">
  <AppHeader :status="status"/>
    <section class = "chat">
      <div class="chat-info">
        <h2>Первый чат</h2>
        <p2>локальный мессенджер</p2>
      </div>
      <MessageList :messages="messages"/>
      <MessageComposer @send="sendMessage"/>
    </section>
  </main>
</template>

<style scoped>
/* все элементы будут использовать одну модель размера */
:global(*){
  box-sizing: border-box;
}

:global(html){
  background: #111318;
  color-scheme: dark;
}

:global(body){
  margin: 0;

  font-family:
  Inter,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;

  color: #f2f3f5;

  background: #111318;
}

.app{
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}


.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-info{
  padding: 20px 24px;
  border-bottom: 1px solid #8f96a3;
}

.chat-info h2 {
  margin: 0;
  font-size: 16px;
}

.chat-info p{
  margin: 5px 0 0;
  color: #292c34;
  font-size: 13px;
}

</style>