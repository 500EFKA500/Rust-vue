<script setup lang="ts">

import type { Message } from "./types/messages.ts";
import type { User } from "./types/user.ts";
import AppHeader from "./components/AppHeader.vue";
import ChatInfo from "./components/ChatInfo.vue";
import EmojesList from "./components/EmojesList.vue";
import Database from "@tauri-apps/plugin-sql"
import { open } from "@tauri-apps/plugin-dialog";
import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
import ChannelList from "./components/ChannelList.vue";
import type { Channel } from "./types/channel";

// импорт 2 фунции из vue
// onMounted - запускает код после появления компонента
// ref -создает быстрое перемещение
import { onMounted, ref, computed } from "vue";
const channels = ref<Channel[]>([]);
const selectedChannelId = ref(1);
const currentChannel = computed(() => channels.value.find(c => c.id === selectedChannelId.value));
const memberIds = ref<number[]>([]);
const subscribed = computed(() => memberIds.value.includes(currentUser.value.id));
const canPublish = computed(() => subscribed.value && currentChannel.value?.owner_id === currentUser.value.id);
const busy = ref(false);
let messageRequest = 0;
const isEmojiOpen = ref(false);
const draft = ref("")
const attachmentPath = ref<string | null>(null);

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

async function selectUser(user: User){
  if (busy.value) return;
  currentUser.value = user;
  messages.value = []; draft.value = ''; clearAttachment();
  try { await loadMessages(); } catch (error) { console.error(error); status.value = 'Не удалось загрузить историю'; }
}

// список соо которые vue отображает в диалоговом экране
const messages = ref<Message[]>([]);

// статус подключения
const status = ref("Подключение...")

// здесь будет подключение к бд
// здесь будет подключение кд
let db: Database | null = null;

// асинхронная функция загрузки соо из sql
async function loadMessages(){
  // если база не подключена прерываем выполнение
  if (!db) return;

  // читаем данные
  const request = ++messageRequest;
  const channelId = selectedChannelId.value;
  const userId = currentUser.value.id;
  const members = await db.select<{user_id:number}[]>('SELECT user_id FROM channel_members WHERE channel_id=$1', [channelId]);
  const loaded = await db.select<Message[]>(
      "SELECT id, author, body, created_at, image_path, channel_id FROM messages WHERE channel_id=$1 AND EXISTS(SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2) ORDER BY id ASC",
      [channelId,userId],
  );
  if (request === messageRequest && selectedChannelId.value === channelId && currentUser.value.id === userId) {
    memberIds.value = members.map(m => m.user_id); messages.value = loaded;
  }
}

async function loadChannels() {
  if (db) channels.value = await db.select<Channel[]>("SELECT id,name,description,owner_id FROM channels ORDER BY id");
}
async function selectChannel(id: number) {
  if (busy.value || !channels.value.some(c => c.id === id)) return;
  selectedChannelId.value = id;
  messages.value = [];
  memberIds.value = [];
  draft.value = '';
  clearAttachment();
  try { await loadMessages(); } catch (error) { console.error(error); status.value = 'Не удалось загрузить сообщения'; }
}
async function changeSubscription() {
  if (!db || busy.value) return;
  if (currentChannel.value?.owner_id === currentUser.value.id) { status.value = 'Владелец остаётся подписчиком'; return; }
  busy.value = true;
  try {
    if (subscribed.value) await db.execute('DELETE FROM channel_members WHERE channel_id=$1 AND user_id=$2',[selectedChannelId.value,currentUser.value.id]);
    else await db.execute('INSERT OR IGNORE INTO channel_members(channel_id,user_id) VALUES($1,$2)',[selectedChannelId.value,currentUser.value.id]);
    await loadMessages(); status.value = subscribed.value ? 'Подписка оформлена' : 'Подписка отменена';
  } catch(error) { console.error(error); status.value = 'Не удалось изменить подписку'; }
  finally { busy.value = false; }
}
async function createChannel(name: string, description: string) {
  if (!db || busy.value) return;
  name = name.trim(); description = description.trim();
  if (!name || name.length > 60 || description.length > 200) { status.value = 'Название: 1-60 символов, описание: до 200'; return; }
  busy.value = true;
  try {
    const result = await db.execute('INSERT INTO channels(name,description,owner_id) VALUES($1,$2,$3)', [name,description,currentUser.value.id]);
    await loadChannels();
    selectedChannelId.value = result.lastInsertId ?? 1;
    draft.value = ''; clearAttachment(); messages.value = [];
    await loadMessages(); status.value = 'Канал создан';
  } catch (error) { console.error(error); status.value = 'Не удалось создать канал: проверь уникальность названия'; }
  finally { busy.value = false; }
}

async function chooseAttachment(){
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Файлы",
        extensions: ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt"],
      },
    ],
  });

  if (typeof selected === "string") {
    // Сохраняем исходный путь: имя и расширение файла не подменяются на .png.
    attachmentPath.value = selected;
  }
}

function clearAttachment(){
  attachmentPath.value = null;
}

async function sendMessage(body: string){
  if (!db || busy.value || !canPublish.value || (!body.trim() && !attachmentPath.value)) return;
  busy.value = true;
  try {
    await db.execute(
      "INSERT INTO messages (author, body, image_path, channel_id) SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM channels c JOIN channel_members m ON m.channel_id=c.id WHERE c.id=$4 AND c.owner_id=$5 AND m.user_id=$5)",
      [
          currentUser.value.name,
          body,
          attachmentPath.value,
          selectedChannelId.value,
          currentUser.value.id,
      ],
  );

    clearAttachment(); draft.value = '';
    await loadMessages();
  } catch (error) { console.error(error); status.value = 'Сообщение не отправлено'; }
  finally { busy.value = false; }

}

// VUE выполнит код ниже, когда интерфейс загружен
onMounted(async()=>{
  try{
    // Открываем бд
    db = await Database.load("sqlite:messanger.db");

    await loadChannels();

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
  <AppHeader
      :users="users"
      :current-user-id="currentUser.id"
      @select="selectUser"
  />
    <ChannelList :channels="channels" :selected-id="selectedChannelId" :disabled="busy || !db"
      @select="selectChannel" @create="createChannel" />
    <p role="status" class="connection-status">{{ status }}</p>
    <div class="connection-status">
      {{ subscribed ? 'Подписан' : 'Не подписан' }} · Подписчиков: {{ memberIds.length }} ·
      {{ canPublish ? 'Вы владелец: можете публиковать' : 'Публикует только владелец' }}
      <button :disabled="busy || !db || currentChannel?.owner_id === currentUser.id" @click="changeSubscription">
        {{ subscribed ? 'Отписаться' : 'Подписаться' }}
      </button>
    </div>
    <section class = "chat">
      <ChatInfo
          :title="currentChannel?.name ?? 'Канал'"
          :description="currentChannel?.description ?? 'Локальный мессенджер'"
      />
      <MessageList
          :messages="messages"
          :current-user-name="currentUser.name"
      />
      <MessageComposer
          v-model="draft"
          :disabled="busy || !db || !canPublish"
          :attachment-name="attachmentPath?.split(/[/\\]/).pop() ?? null"
          @send="sendMessage"
          @attach="chooseAttachment"
          @clear-attachment="clearAttachment"
          @toggle-emoji="isEmojiOpen = !isEmojiOpen"
      />
    </section>
    <EmojesList
        v-if="isEmojiOpen"
        @select="addEmoji"
    />
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
.connection-status { margin: 0; padding: 6px 20px; color: #b7c3da; font-size: 12px; }


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

.emoji-window{
  flex: 40px;
  color: red;
}

</style>
