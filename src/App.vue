<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import ChatHeader from "./components/ChatHeader.vue";
import GroupCreator from "./components/GroupCreator.vue";
import GroupInfo from "./components/GroupInfo.vue";
import ChannelEditor from "./components/ChannelEditor.vue";
import ChannelInfo from "./components/ChannelInfo.vue";
import ChannelComments from "./components/ChannelComments.vue";
import ChatSidebar from "./components/ChatSidebar.vue";
import MessageList from "./components/MessageList.vue";
import MessageComposer from "./components/MessageComposer.vue";
import AuthScreen from "./components/AuthScreen.vue";
import AccountMenu from "./components/AccountMenu.vue";
import ProfileEditor from "./components/ProfileEditor.vue";
import ModalDialog from "./components/ModalDialog.vue";
import ChatActions from "./components/ChatActions.vue";
import { useAccounts } from "./composables/useAccounts";
import { useChats } from "./composables/useChats";
import { useAppearance } from "./composables/useAppearance";
import { useAppearanceAutosave } from "./composables/useAppearanceAutosave";
import { ApiError, request } from "./services/api";
import type { Channel, ChannelUpdate } from "./types/channel";
import type { Credentials } from "./types/account";
import type { ProfileUpdate, User } from "./types/user";
import type { Message } from "./types/message";
import type { Chat } from "./types/chats";
import "./styles/accounts.css";
import "./styles/theme.css";

const accounts = useAccounts();
const chatState = useChats();
const { currentUser, savedUsers, loading, busy, error: authError } = accounts;
const { preview: appearancePreview } = useAppearance(currentUser);
const appearanceSaver = useAppearanceAutosave(
  currentUser,
  appearancePreview,
  accounts.updateAppearance,
);
const { status: appearanceStatus, error: appearanceError } = appearanceSaver;
const { chats, messages, activeChat } = chatState;
const menuOpen = ref(false);
const addingAccount = ref(false);
const profileOpen = ref(false);
const profileTab = ref<"profile" | "appearance">("profile");
const managedChat = ref<Chat | null>(null);
const chatBusy = ref(false);
const chatError = ref("");
const groupOpen = ref(false);
const groupError = ref("");
const inspectedGroup = ref<Chat | null>(null);
const inspectedChannelId = ref<number | null>(null);
const channelEditorOpen = ref(false);
const editingChannel = ref<Channel | null>(null);
const channelBusy = ref(false);
const channelError = ref("");
const discussedPost = ref<Message | null>(null);
watch(messages, (loaded) => {
  if (discussedPost.value)
    discussedPost.value =
      loaded.find((post) => post.id === discussedPost.value?.id) ?? null;
});
watch(
  () => currentUser.value?.id,
  () => {
    inspectedChannelId.value = null;
    channelEditorOpen.value = false;
    editingChannel.value = null;
    discussedPost.value = null;
    inspectedGroup.value = null;
    groupOpen.value = false;
    managedChat.value = null;
  },
);
watch(
  () => activeChat.value?.id,
  () => {
    discussedPost.value = null;
  },
);
watch(profileOpen, (open) => {
  if (!open) void appearanceSaver.flush();
});
const accountBusy = ref(false);
const profileBusy = ref(false);
const profileError = ref("");
const appError = ref("");
const sendBusy = ref(false);
const sendError = ref("");
const sentVersion = ref(0);
const status = ref("Подключение к серверу…");
const pendingMessageId = ref<number | null>(null);
const messageError = ref<{ messageId: number | null; text: string }>({
  messageId: null,
  text: "",
});
let timer: ReturnType<typeof setInterval> | undefined;

async function reportError(cause: unknown) {
  appError.value = cause instanceof Error ? cause.message : String(cause);
  status.value = "Нет связи с сервером";
  if (cause instanceof ApiError && cause.status === 401) {
    menuOpen.value = false;
    profileOpen.value = false;
    addingAccount.value = false;
    chatState.reset();
    await accounts.expireCurrent();
  }
}

async function loadWorkspace() {
  messageError.value = { messageId: null, text: "" };
  await chatState.initialize();
  appError.value = "";
  status.value = "На связи";
}

async function authenticate(
  mode: "login" | "register",
  credentials: Credentials,
) {
  if (!(await appearanceSaver.flush())) return;
  chatState.reset();
  if (await accounts.authenticate(mode, credentials)) {
    addingAccount.value = false;
    try {
      await loadWorkspace();
    } catch (cause) {
      await reportError(cause);
    }
  } else if (currentUser.value) {
    try {
      await loadWorkspace();
    } catch (cause) {
      await reportError(cause);
    }
  }
}

async function selectAccount(user: User) {
  if (accountBusy.value || pendingMessageId.value !== null) return;
  accountBusy.value = true;
  try {
    if (!(await appearanceSaver.flush())) return;
    chatState.reset();
    await accounts.activate(user);
    await loadWorkspace();
    menuOpen.value = false;
  } catch (cause) {
    await reportError(cause);
    if (currentUser.value) {
      try {
        await loadWorkspace();
      } catch {
        /* Ошибка уже показана. */
      }
    }
  } finally {
    accountBusy.value = false;
  }
}

async function openAddAccount() {
  if (!(await appearanceSaver.flush())) return;
  menuOpen.value = false;
  authError.value = "";
  addingAccount.value = true;
}
function openProfile(tab: "profile" | "appearance" = "profile") {
  menuOpen.value = false;
  profileError.value = "";
  profileTab.value = tab;
  profileOpen.value = true;
}

async function createGroup(title: string, memberIds: number[]) {
  if (chatBusy.value) return;
  chatBusy.value = true;
  groupError.value = "";
  try {
    await chatState.createGroup(title, memberIds);
    groupOpen.value = false;
  } catch (cause) {
    groupError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    chatBusy.value = false;
  }
}

async function writeUser(user: User) {
  if (chatBusy.value) return;
  chatBusy.value = true;
  try {
    await chatState.writeUser(user);
    appError.value = "";
  } catch (cause) {
    await reportError(cause);
  } finally {
    chatBusy.value = false;
  }
}

function openChannelEditor(channel: Channel | null = null) {
  menuOpen.value = false;
  inspectedChannelId.value = null;
  editingChannel.value = channel;
  channelError.value = "";
  channelEditorOpen.value = true;
}
function inspectChannel(id: number) {
  channelError.value = "";
  inspectedChannelId.value = id;
}
async function saveChannel(value: ChannelUpdate) {
  if (channelBusy.value) return;
  channelBusy.value = true;
  channelError.value = "";
  try {
    if (editingChannel.value) {
      await request(`/api/channels/${editingChannel.value.id}`, "PATCH", value);
      channelEditorOpen.value = false;
      try {
        await chatState.refresh();
      } catch (cause) {
        await reportError(cause);
      }
    } else {
      await chatState.createChannel(value);
      channelEditorOpen.value = false;
    }
  } catch (cause) {
    channelError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    channelBusy.value = false;
  }
}
async function subscribeChannel(id: number) {
  if (channelBusy.value) return;
  channelBusy.value = true;
  channelError.value = "";
  try {
    await chatState.subscribeChannel(id);
    inspectedChannelId.value = null;
  } catch (cause) {
    channelError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    channelBusy.value = false;
  }
}
async function leaveChannel() {
  if (!inspectedChannelId.value || channelBusy.value) return;
  channelBusy.value = true;
  channelError.value = "";
  try {
    await chatState.leaveChannel(inspectedChannelId.value);
    inspectedChannelId.value = null;
  } catch (cause) {
    channelError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    channelBusy.value = false;
  }
}

function manageChat(chat: Chat) {
  managedChat.value = chat;
  chatError.value = "";
}

async function updateChat(settings: { muted?: boolean; pinned?: boolean }) {
  if (!managedChat.value || chatBusy.value) return;
  chatBusy.value = true;
  chatError.value = "";
  try {
    await chatState.updateChat(managedChat.value, settings);
    managedChat.value = null;
  } catch (cause) {
    chatError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    chatBusy.value = false;
  }
}

async function removeChat() {
  if (!managedChat.value || chatBusy.value) return;
  chatBusy.value = true;
  chatError.value = "";
  try {
    await chatState.removeChat(managedChat.value);
    managedChat.value = null;
  } catch (cause) {
    chatError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    chatBusy.value = false;
  }
}

async function saveProfile(profile: ProfileUpdate) {
  profileBusy.value = true;
  profileError.value = "";
  try {
    if (!(await appearanceSaver.flush())) return;
    await accounts.updateProfile(profile);
    await chatState.refresh();
    profileOpen.value = false;
  } catch (cause) {
    profileError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    profileBusy.value = false;
  }
}

async function logout() {
  accountBusy.value = true;
  try {
    if (!(await appearanceSaver.flush())) return;
    chatState.reset();
    await accounts.logout();
    menuOpen.value = false;
    if (currentUser.value) await loadWorkspace();
  } catch (cause) {
    await reportError(cause);
    if (currentUser.value) {
      try {
        await loadWorkspace();
      } catch {
        /* Ошибка уже показана. */
      }
    }
  } finally {
    accountBusy.value = false;
  }
}

async function selectChat(chat: Chat) {
  if (chatBusy.value || sendBusy.value) return;
  chatBusy.value = true;
  try {
    await chatState.selectChat(chat);
    appError.value = "";
  } catch (cause) {
    await reportError(cause);
  } finally {
    chatBusy.value = false;
  }
}
async function sendMessage(body: string) {
  if (sendBusy.value) return;
  sendBusy.value = true;
  sendError.value = "";
  try {
    await chatState.sendMessage(body);
    sentVersion.value++;
    appError.value = "";
  } catch (cause) {
    sendError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    sendBusy.value = false;
  }
}
async function sendImage(path: string) {
  if (sendBusy.value) return;
  sendBusy.value = true;
  sendError.value = "";
  try {
    await chatState.sendImage(path);
    appError.value = "";
  } catch (cause) {
    sendError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    sendBusy.value = false;
  }
}
async function changeMessage(
  message: Message,
  action: "edit" | "delete",
  body = "",
) {
  if (pendingMessageId.value !== null) return;
  pendingMessageId.value = message.id;
  messageError.value = { messageId: null, text: "" };
  try {
    if (action === "edit") await chatState.editMessage(message, body);
    else await chatState.deleteMessage(message);
  } catch (cause) {
    messageError.value = {
      messageId: message.id,
      text: cause instanceof Error ? cause.message : String(cause),
    };
  } finally {
    pendingMessageId.value = null;
  }
}

async function refresh() {
  if (
    !currentUser.value ||
    accountBusy.value ||
    busy.value ||
    addingAccount.value ||
    profileBusy.value ||
    chatBusy.value ||
    document.visibilityState !== "visible"
  )
    return;
  try {
    await chatState.refresh();
    status.value = "На связи";
  } catch (cause) {
    await reportError(cause);
  }
}

onMounted(async () => {
  await accounts.initialize();
  if (currentUser.value) {
    try {
      await loadWorkspace();
    } catch (cause) {
      await reportError(cause);
    }
  }
  timer = setInterval(refresh, 3000);
  document.addEventListener("visibilitychange", refresh);
});
onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", refresh);
  chatState.reset();
});
</script>

<template>
  <main class="app">
    <p v-if="loading" class="boot-status">Открываем DesireMes…</p>
    <div v-else-if="!currentUser" class="auth-page">
      <AuthScreen :busy="busy" :error="authError" @submit="authenticate" />
      <button
        v-if="savedUsers.length"
        class="text-button"
        @click="accounts.initialize"
      >
        Повторить подключение
      </button>
    </div>
    <template v-else>
      <div
        v-if="appError || (!profileOpen && appearanceError)"
        class="connection-error"
        role="alert"
      >
        <span>{{ appError || appearanceError }}</span
        ><button
          type="button"
          class="text-button"
          @click="appearanceError ? appearanceSaver.flush() : refresh()"
        >
          Повторить
        </button>
      </div>
      <div class="workspace">
        <ChatSidebar
          :key="currentUser.id"
          :chats="chats"
          :active-chat-id="activeChat?.id || 0"
          :busy="
            chatBusy ||
            accountBusy ||
            sendBusy ||
            pendingMessageId !== null ||
            channelBusy
          "
          @select="selectChat"
          @write="writeUser"
          @manage="manageChat"
          @menu="menuOpen = true"
          @channel="(channel) => inspectChannel(channel.id)"
        />
        <section class="chat">
          <template v-if="activeChat">
            <ChatHeader
              :chat="activeChat"
              :busy="chatBusy || sendBusy || pendingMessageId !== null"
              @menu="manageChat(activeChat)"
              @info="
                activeChat.kind === 'channel'
                  ? inspectChannel(activeChat.id)
                  : (inspectedGroup = activeChat)
              "
            />
            <MessageList
              :key="activeChat.id + '-' + currentUser.id"
              :messages="messages"
              :current-user-id="currentUser.id"
              :pending-message-id="pendingMessageId"
              :message-error="messageError"
              :channel="activeChat.kind === 'channel'"
              :comments-enabled="Boolean(activeChat.comments_enabled)"
              @edit="(message, body) => changeMessage(message, 'edit', body)"
              @delete="(message) => changeMessage(message, 'delete')"
              @comments="discussedPost = $event"
            />
            <MessageComposer
              v-if="activeChat.kind !== 'channel' || activeChat.can_post"
              :key="currentUser.id + '-' + activeChat.id"
              :pending="sendBusy || chatBusy || accountBusy"
              :send-error="sendError"
              :sent-version="sentVersion"
              @send="sendMessage"
              @send-image="sendImage"
            />
            <div v-else class="channel-readonly">
              <span>Публикует владелец канала</span
              ><button
                class="text-button"
                @click="inspectChannel(activeChat.id)"
              >
                О канале
              </button>
            </div>
          </template>
          <div v-else class="chat-placeholder">
            Найдите пользователя в поиске слева, чтобы начать переписку
          </div>
        </section>
      </div>
      <AccountMenu
        v-if="menuOpen"
        :user="currentUser"
        :accounts="savedUsers"
        :status="status"
        :busy="accountBusy || chatBusy || sendBusy || pendingMessageId !== null"
        @close="menuOpen = false"
        @select="selectAccount"
        @add="openAddAccount"
        @profile="openProfile"
        @appearance="openProfile('appearance')"
        @logout="logout"
        @channel="openChannelEditor()"
        @group="
          menuOpen = false;
          groupError = '';
          groupOpen = true;
        "
      />
      <ProfileEditor
        v-if="profileOpen"
        :key="currentUser.id"
        :user="currentUser"
        :busy="profileBusy"
        :error="profileError"
        :initial-tab="profileTab"
        :appearance-value="appearancePreview ?? currentUser.appearance"
        :appearance-status="appearanceStatus"
        :appearance-error="appearanceError"
        @close="profileOpen = false"
        @save="saveProfile"
        @change-appearance="appearanceSaver.change"
        @flush-appearance="appearanceSaver.flush"
      />
      <GroupCreator
        v-if="groupOpen"
        :busy="chatBusy"
        :error="groupError"
        @close="groupOpen = false"
        @create="createGroup"
      />
      <GroupInfo
        v-if="inspectedGroup"
        :chat="inspectedGroup"
        @close="inspectedGroup = null"
      />
      <ChannelEditor
        v-if="channelEditorOpen"
        :channel="editingChannel"
        :busy="channelBusy"
        :error="channelError"
        @close="channelEditorOpen = false"
        @save="saveChannel"
      />
      <ChannelInfo
        v-if="inspectedChannelId"
        :key="inspectedChannelId + '-' + currentUser.id"
        :id="inspectedChannelId"
        :busy="channelBusy"
        :error="channelError"
        @close="inspectedChannelId = null"
        @subscribe="subscribeChannel"
        @leave="leaveChannel"
        @edit="openChannelEditor"
      />
      <ChannelComments
        v-if="discussedPost && activeChat?.kind === 'channel'"
        :key="currentUser.id + '-' + discussedPost.id"
        :post="discussedPost"
        :current-user-id="currentUser.id"
        :can-moderate="Boolean(activeChat.can_post)"
        @close="discussedPost = null"
        @changed="refresh"
      />
      <ChatActions
        v-if="managedChat"
        :chat="managedChat"
        :busy="chatBusy || sendBusy || accountBusy || pendingMessageId !== null"
        :error="chatError"
        @close="managedChat = null"
        @update="updateChat"
        @remove="removeChat"
        @info="
          inspectChannel(managedChat.id);
          managedChat = null;
        "
      />
      <ModalDialog
        v-if="addingAccount"
        label="Добавить аккаунт"
        @close="!busy && (addingAccount = false)"
      >
        <AuthScreen
          adding
          :busy="busy"
          :error="authError"
          @submit="authenticate"
          @cancel="addingAccount = false"
        />
      </ModalDialog>
    </template>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
:global(html) {
  background: var(--bg);
  color-scheme: var(--color-scheme);
}
:global(body) {
  margin: 0;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: var(--text);
  background: var(--bg);
}
.app {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.auth-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
}
.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.boot-status {
  margin: 24px;
  color: var(--text-muted);
}
.chat {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chat-placeholder {
  margin: auto;
  padding: 24px;
  max-width: 340px;
  text-align: center;
  line-height: 1.6;
  color: var(--text-muted);
}
.channel-readonly {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
}
.connection-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 20px;
  background: #41232b;
  color: #ffc2c2;
  font-size: 13px;
}
.connection-error .text-button {
  margin: 0;
  white-space: nowrap;
}
</style>
