<script setup lang="ts">

import type { Message } from "./types/messages.ts";
import type { User } from "./types/user.ts";
import AppHeader from "./components/AppHeader.vue";
import EmojesList from "./components/EmojesList.vue";
import Database from "@tauri-apps/plugin-sql"
import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
import ChatsSidebar from "./components/chatsSidebar.vue";
import ChatInfo from "./components/Chatinfo.vue";
import type { Chat } from "./types/chats.ts";

// импорт 2 фунции из vue
// onMounted - запускает код после появления компонента
// ref -создает быстрое перемещение
import { onMounted, ref } from "vue";
const isEmojiOpen = ref(false);
const draft = ref("")
function addEmoji(emoji: string) {
  draft.value += emoji;
  isEmojiOpen.value = false;
}

const oleg: User = {
  id: 1,
  name: "Олег",
};

const kirill: User = {
  id: 2,
  name: "Киррил",
};

const users: User[] = [
  oleg,
  kirill,
];

const currentUser = ref<User>(oleg);

function selectUser(user: User){
  currentUser.value = user;
}
const chats = ref<Chat[]>([]);
const activeChat = ref<Chat | null>(null);

const activeChatId = ref(1);
// список соо которые vue отображает в диалоговом экране
const messages = ref<Message[]>([]);

// здесь будет подключение к бд
// здесь будет подключение кд
let db: Database | null = null;

// асинхронная функция загрузки соо из sql

async function sendImage(filePath: string) {
  if (!db) return;
  if (!activeChat.value) return;

  await db.execute(
      `INSERT INTO messages (chat_id, author, body, image_path)
     VALUES ($1, $2, $3, $4)`,
      [
        activeChat.value.id,
        currentUser.value.name,
        "",
        filePath,
      ],
  )

  await loadMessages(activeChat.value.id)
}
async function loadMessages(chatId: number){
  // если база не подключена прерываем выполнение
  if (!db) return;

  // читаем данные
  messages.value = await db.select<Message[]>(
      "SELECT id, author, body, image_path, created_at FROM messages WHERE chat_id = $1 ORDER BY id ASC",
      [chatId]
  );
}

async function sendMessage(body: string){
  if (!db) return;


  if (!activeChat.value) return;

  await db.execute(
    `
      INSERT INTO messages (
            chat_id,
            author,
            body
      )
      VALUES ($1, $2, $3)
    `,
      [
          activeChat.value.id,
          currentUser.value.name,
          body,
      ],
  );

  await loadMessages(activeChat.value.id)

}
async function loadChats(){
  if (!db) return;

  chats.value = await db.select<Chat[]>(
      "SELECT id, title, subtitle FROM chats ORDER BY id ASC"
  )

  if (chats.value.length > 0){
    await selectChat(chats.value[0]);
  }
}

async function selectChat(chat: Chat){
  activeChat.value = chat;

  activeChatId.value = chat.id

  await loadMessages(chat.id)
}
// VUE выполнит код ниже, когда интерфейс загружен
onMounted(async()=>{
  try{
    // Открываем бд
    db = await Database.load("sqlite:messanger.db");

    // загружаем из базы старые соо
    await loadChats();

  } catch (error){
    console.error(error);
  }
});

</script>

<template>
  <main class="app">
  <AppHeader
      :users="users"
      :current-user-id="currentUser.id"
      @select="selectUser"
  />
    <div class="workspace">
      <ChatsSidebar
          :chats="chats"
          :active-chat-id="activeChatId"
          @select="selectChat"
      />
      <section class = "chat">
        <template v-if="activeChat">
          <ChatInfo
            :title="activeChat.title"
            :subtitle="activeChat.subtitle"
          />
          <MessageList
              :messages="messages"
              :current-user-name="currentUser.name"
          />
          <MessageComposer
              v-model="draft"
              @send="sendMessage"
              @toggle-emoji="isEmojiOpen = !isEmojiOpen"
              @image="sendImage"
          />
          <EmojesList
              v-if="isEmojiOpen"
              @select="addEmoji"
              @image="sendImage"
          />
        </template>

      </section>
    </div>


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

</style>
