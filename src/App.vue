<script setup lang="ts">

import type { User } from "./types/user";

// Импорт 2 функций из vue
// onMounted - запускает код после появления компонента
// ref -  создает быстрые перемещения
import { onMounted, ref } from "vue";

import Database from "@tauri-apps/plugin-sql";

import AppHeader from "./components/AppHeader.vue";

import MessageList from "./components/MessageList.vue";

import MessageComposer from "./components/MessageComposer.vue";

import ChatSidebar from "./components/ChatSidebar.vue";

import type { Chat } from "./types/chats";

import type { Message } from "./types/message.ts";

import type {ProfileUpdate} from "./types/user";

import ProfileEditor from "./components/ProfileEditor.vue";

const isProfileOpen = ref(false);

function openProfile(){
  isProfileOpen.value = true;
}

function closeProfile(){
  isProfileOpen.value = false;
}


async function saveProfile( profile: ProfileUpdate, ){
  if (!db) return;
  if (!currentUser.value) return;

  await db.execute(
      `
        UPDATE users

        SET
            display_name = $1,
            status = $2

        WHERE id = $3
      `,
      [
          profile.displayName,
          profile.status,
          currentUser.value.id,
      ],
  );

  currentUser.value.display_name = profile.displayName;
  currentUser.value.status = profile.status;

  if(activeChat.value){
    await loadMessages(
        activeChat.value.id,
    );
  }

  closeProfile();
}

const users = ref<User[]>([]);

const currentUser = ref<User | null>(null);

async function selectUser(user: User) {
  currentUser.value = user;
  activeChat.value = null;

  await loadChats();

  const savedChatId = await getSelectedChatId(user.id);

  const chatToOpen =
      chats.value.find((chat) => chat.id === savedChatId)
      ?? chats.value[0];

  if (chatToOpen) {
    await selectChat(chatToOpen);
  }
}

// Создаем структуру одного сообщения

// Список сообщений, которые vue отображет в диалоге на экране
const messages = ref<Message[]>([]);

const chats = ref<Chat[]>([]);

const activeChat = ref<Chat | null>(null);

const activeChatId = ref(1);

// Статус подключения к бд
const status = ref("Подключение...")

// Здесь будет подключение к бд (честно), но пока тут null
let db: Database | null = null;

async function getSelectedChatId(userId: number) {
  if (!db) return null;

  const result = await db.select<{ selected_chat_id: number | null }[]>(
      `
      SELECT selected_chat_id
      FROM user_chat_state
      WHERE user_id = $1
    `,
      [userId],
  );

  return result[0]?.selected_chat_id ?? null;
}

async function saveSelectedChat(chatId: number) {
  if (!db || !currentUser.value) return;

  await db.execute(
      `
      INSERT INTO user_chat_state (
        user_id,
        selected_chat_id
      )
      VALUES ($1, $2)

      ON CONFLICT(user_id)
      DO UPDATE SET
        selected_chat_id = excluded.selected_chat_id
    `,
      [currentUser.value.id, chatId],
  );
}

async function loadChats(){
  const user = currentUser.value;

  if (!db || !user) return;

  chats.value = await db.select<Chat[]>(
      `
      SELECT
        chats.id,
        chats.title,
        chats.subtitle,
        COUNT(messages.id) AS unread_count
      FROM chats

      LEFT JOIN chat_read_state
        ON chat_read_state.chat_id = chats.id
        AND chat_read_state.user_id = $1

      LEFT JOIN messages
        ON messages.chat_id = chats.id
        AND messages.id > COALESCE(chat_read_state.last_read_message_id, 0)
        AND messages.author_id != $1

      GROUP BY chats.id
      ORDER BY chats.id ASC
    `,
      [user.id],
  );

}

async function markChatAsRead(chatId: number) {
  if (!db || !currentUser.value) return;

  const result = await db.select<{ last_id: number | null }[]>(
      `
      SELECT MAX(id) AS last_id
      FROM messages
      WHERE chat_id = $1
    `,
      [chatId],
  );

  const lastMessageId = result[0]?.last_id ?? 0;

  await db.execute(
      `
      INSERT INTO chat_read_state (
        user_id,
        chat_id,
        last_read_message_id
      )
      VALUES ($1, $2, $3)

      ON CONFLICT(user_id, chat_id)
      DO UPDATE SET
        last_read_message_id = excluded.last_read_message_id
    `,
      [currentUser.value.id, chatId, lastMessageId],
  );
}

async function selectChat(chat: Chat){
  activeChat.value = chat;
  activeChatId.value = chat.id;

  await saveSelectedChat(chat.id);
  await loadMessages(chat.id);
  await markChatAsRead(chat.id);
  await loadChats();
}

// Асинхронная функция загрузки сообщений из sql
async function loadMessages(chatId: number){
  // Если база еще не подключена, прерываем выполнение
  if (!db) return;

  // Читаем данные из таблицы messages
  messages.value = await db.select<Message[]>(
    `SELECT
       messages.id,
       messages.chat_id,
       messages.author_id,
       users.display_name AS author_name,
       users.avatar_path AS author_avatar,
       messages.type,
       messages.body,
       messages.attachment,
       messages.created_at
      FROM messages
      INNER JOIN users
            ON users.id = messages.author_id
      WHERE messages.chat_id = $1
      ORDER BY messages.id ASC`,
      [chatId],
  );
}

async function loadUsers(){
  if(!db) return;

  users.value =
      await  db.select<User[]>(
          `
          SELECT
            id,
            username,
            display_name,
            avatar_path,
            status,
            created_at
          FROM users
          ORDER BY id ASC
         `,
      );
  if (users.value.length > 0 && currentUser.value === null){
    currentUser.value = users.value[0];
  }
}

// Функция отправки нового сообщения
async function sendMessage(body: string){
  if (!db) return;

  if (!activeChat.value) return;

  if (!currentUser.value) return;

  await db.execute(
    `
       INSERT INTO messages (
            chat_id,
            author_id,
            type,
            body,
            attachment
       )
       VALUES ($1, $2, $3, $4, $5)
    `,
      [
          activeChat.value.id,
          currentUser.value.id,
          "text",
          body,
          null,
      ],
  );
  await loadMessages(activeChat.value.id)
}

async function sendImage(path:string){
  if(!db)
    return;

  if (!activeChat.value)
    return;

  if (!currentUser.value) return;

  await db.execute(
      `
        INSERT INTO messages
        (
           chat_id,
           author_id,
           type,
           body,
           attachment
        )

        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5
        )
      `,
      [
          activeChat.value.id,
          currentUser.value.id,
          "image",
          null,
          path,
      ]
  );

  await loadMessages(
      activeChat.value.id
  )
}

// VUE выполнит код ниже, когда интерфейс программы уже загрузится
onMounted(async()=>{
  try{
    // Открываем бд
    db = await Database.load("sqlite:messenger_v2.db");

    // Загружаем из базы старые сообщения
    await loadUsers();

    if (users.value.length > 0) {
      await selectUser(users.value[0]);
    }

    await loadChats();
    // Показываем успешеное состоние
    status.value = "История сохраняется локально";
  }catch (error){
    console.error(error);

    status.value = "Ошибка подключения к базе";
  }
});

</script>

<template>
  <main class="app">
    <AppHeader
        v-if="currentUser"
        :status="status"
        :users="users"
        :current-user="currentUser"
        @select="selectUser"
        @profile="openProfile"
    />
    <p v-else class="boot-status">{{ status }}</p>
    <div
        v-if="currentUser"
        class="workspace"
    >
      <ChatSidebar
          :chats="chats"
          :active-chat-id="activeChatId"
          @select="selectChat"
      />
      <section class="chat">
        <template v-if="activeChat">
          <div class="chat-info">
            <h2>{{ activeChat.title }}</h2>
            <p>{{ activeChat.subtitle }}</p>
          </div>
          <MessageList
              :key="activeChat.id"
              :messages="messages"
              :current-user-id="currentUser.id"
          />
          <MessageComposer
              @send="sendMessage"
              @sendImage="sendImage"
          />
        </template>
      </section>
    </div>
    <ProfileEditor
        v-if="isProfileOpen && currentUser"
        :key="currentUser.id"
        :user="currentUser"
        @save="saveProfile"
        @close="closeProfile"
    ></ProfileEditor>
  </main>
</template>

<style scoped>
/* Все элементы будут использовать одну модель размеров */
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

.workspace{
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.app{
  height: 100vh;
  display: flex;
  flex-direction: column;
  /*
      Запретит всему app прокручиваться
      Разрешим прокрутку только для MessageList
  */
  overflow: hidden;
}

.boot-status{
  margin: 24px;
  color: #858c98;
}

.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Потому что chat целиком не должен прокручиваться, только MessageList внутри него */
}

.chat-info{
  padding: 20px 24px;
  border-bottom: 1px solid #252830;
}

.chat-info h2{
  margin: 0;
  font-size: 16px;
}

.chat-info p{
  margin: 5px 0 0;
  color: #858c98;
  font-size: 13px;
}

</style>










