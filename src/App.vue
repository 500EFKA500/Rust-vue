<script setup lang="ts">

import type { Message } from "./types/messages.ts";
import type { User } from "./types/user.ts";
import Database from "@tauri-apps/plugin-sql"
import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
import UserSwitcher from "./components/UserSwitcher.vue";
// импорт 2 фунции из vue
// onMounted - запускает код после появления компонента
// ref -создает быстрое перемещение
import { onMounted, ref } from "vue";
import AppHeader from "./components/AppHeader.vue";

const oleg: User = {
  id: 1,
  name: "Олег",
};

const kirill: User = {
  id: 2,
  name: "Киррил",
};

const users: User[] ={
  oleg,
  kirill,
};

const currentUser = ref<User>(oleg);

function selectUser(user: User){
  currentUser.value = user;
}

// список соо которые vue отображает в диалоговом экране
const messages = ref<Message[]>([]);

// Список пользователей приходит из таблицы users в SQLite.
const users = ref<User[]>([]);
const currentUserId = ref<number | null>(null);

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

// Загружаем пользователей из базы. До появления записей массив остаётся пустым.
async function loadUsers(){
  if (!db) return;

  users.value = await db.select<User[]>(
      "SELECT id, name FROM users ORDER BY id ASC",
  );

  // Если текущий пользователь ещё не выбран, выбираем первого из базы.
  if (currentUserId.value === null && users.value.length > 0) {
    currentUserId.value = users.value[0].id;
  }
}

function selectUser(user: User){
  currentUserId.value = user.id;
}

async function sendMessage(body: string){
  if (!db) return;

  const author = users.value.find((user) => user.id === currentUserId.value)?.name ?? "Вы";

  await db.execute(
      "INSERT INTO messages (author, body) VALUES ($1, $2)",
      [author, body]
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
    await loadUsers();

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
      <UserSwitcher
        :users="users"
        :current-user-id="currentUserId"
        @select="selectUser"
      />
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  /*
      запрещает всему app прокурчиваться
      Разрешим пркоурутку только для MessageList
  */
  overflow: hidden;
}


.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /*
      Потому что chat целиком не должен прокручиаться, только
  */
  overflow: hidden;
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
