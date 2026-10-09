import { ref } from "vue";
import { request, uploadAttachment } from "../services/api";
import type { Chat } from "../types/chats";
import type { Message } from "../types/message";
import type { User } from "../types/user";
import type { ChannelUpdate } from "../types/channel";

interface ChatResponse {
  chats: Chat[];
  selectedChatId: number | null;
}
export function useChats() {
  const chats = ref<Chat[]>([]);
  const messages = ref<Message[]>([]);
  const activeChat = ref<Chat | null>(null);
  let revision = 0;
  let refreshing = false;

  function reset() {
    revision++;
    chats.value = [];
    messages.value = [];
    activeChat.value = null;
  }

  async function readVisible(
    chatId: number,
    loaded: Message[],
    version: number,
  ) {
    if (version !== revision || document.visibilityState !== "visible") return;
    const lastMessageId = loaded[loaded.length - 1]?.id ?? 0;
    await request(`/api/chats/${chatId}/read`, "POST", { lastMessageId });
  }

  async function selectChat(chat: Chat) {
    const version = ++revision;
    activeChat.value = chat;
    messages.value = [];
    await request(`/api/chats/${chat.id}/select`, "POST", {});
    if (version !== revision) return;
    const loaded = await request<Message[]>(`/api/chats/${chat.id}/messages`);
    if (version !== revision) return;
    messages.value = loaded;
    await readVisible(chat.id, loaded, version);
    if (version !== revision) return;
    const response = await request<ChatResponse>("/api/chats");
    if (version === revision) chats.value = response.chats;
  }

  async function initialize() {
    reset();
    const version = revision;
    const response = await request<ChatResponse>("/api/chats");
    if (version !== revision) return;
    chats.value = response.chats;
    const selected =
      response.chats.find((chat) => chat.id === response.selectedChatId) ??
      response.chats[0];
    if (selected) await selectChat(selected);
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    const version = revision;
    try {
      const chat = activeChat.value;
      if (chat) {
        const loaded = await request<Message[]>(
          `/api/chats/${chat.id}/messages`,
        );
        if (version !== revision) return;
        // Не заменяем список без изменений: не сбрасываем редактор и прокрутку.
        if (JSON.stringify(loaded) !== JSON.stringify(messages.value))
          messages.value = loaded;
        await readVisible(chat.id, loaded, version);
      }
      if (version !== revision) return;
      const response = await request<ChatResponse>("/api/chats");
      if (version === revision) {
        chats.value = response.chats;
        if (activeChat.value) {
          const updated = response.chats.find(
            (item) => item.id === activeChat.value?.id,
          );
          if (updated) activeChat.value = updated;
          else {
            activeChat.value = null;
            messages.value = [];
            revision++;
          }
        }
      }
    } finally {
      refreshing = false;
    }
  }

  async function sendMessage(body: string) {
    const chat = activeChat.value;
    if (!chat) return;
    await request(`/api/chats/${chat.id}/messages`, "POST", {
      type: "text",
      body,
    });
    // Сервер уже принял сообщение: сбой обновления списка не означает сбой отправки.
    try {
      await refresh();
    } catch {
      /* Повторим обновление при следующем опросе. */
    }
  }

  async function writeUser(user: User) {
    const version = revision;
    const chat = await request<Chat>("/api/chats/direct", "POST", {
      userId: user.id,
    });
    if (version !== revision) return;
    await selectChat(chat);
  }

  async function createGroup(title: string, memberIds: number[]) {
    const version = revision;
    const chat = await request<Chat>("/api/chats/groups", "POST", {
      title,
      memberIds,
    });
    if (version !== revision) return;
    chats.value = [chat, ...chats.value.filter((item) => item.id !== chat.id)];
    try {
      await selectChat(chat);
    } catch {
      // Группа уже создана. Сбой загрузки не должен предлагать создать дубликат;
      // активный чат и его сообщения обновит следующий опрос сервера.
    }
  }

  async function updateChat(
    chat: Chat,
    settings: { muted?: boolean; pinned?: boolean },
  ) {
    const version = revision;
    await request(`/api/chats/${chat.id}`, "PATCH", settings);
    if (version !== revision) return;
    const updatedVersion = ++revision;
    const response = await request<ChatResponse>("/api/chats");
    if (updatedVersion !== revision) return;
    chats.value = response.chats;
    if (activeChat.value) {
      activeChat.value =
        response.chats.find((item) => item.id === activeChat.value?.id) ??
        activeChat.value;
    }
  }

  async function openChannel(path: string, body?: ChannelUpdate) {
    const version = revision;
    const chat = await request<Chat>(path, "POST", body ?? {});
    if (version !== revision) return;
    chats.value = [chat, ...chats.value.filter((item) => item.id !== chat.id)];
    try {
      await selectChat(chat);
    } catch {
      /* Уже сохранён: загрузку повторит опрос. */
    }
  }
  async function leaveChannel(id: number) {
    const version = revision;
    await request(`/api/channels/${id}/subscription`, "DELETE");
    if (version !== revision) return;
    revision++;
    chats.value = chats.value.filter((item) => item.id !== id);
    if (activeChat.value?.id === id) {
      activeChat.value = null;
      messages.value = [];
    }
  }

  async function removeChat(chat: Chat) {
    const version = revision;
    await request(`/api/chats/${chat.id}`, "DELETE");
    if (version !== revision) return;
    revision++;
    if (activeChat.value?.id === chat.id) {
      activeChat.value = null;
      messages.value = [];
    }
    chats.value = chats.value.filter((item) => item.id !== chat.id);
  }

  async function sendImage(path: string) {
    const chat = activeChat.value;
    const version = revision;
    if (!chat) return;
    const attachment = await uploadAttachment(path);
    if (version !== revision) return;
    await request(`/api/chats/${chat.id}/messages`, "POST", {
      type: "image",
      attachment,
    });
    try {
      await refresh();
    } catch {
      /* Сообщение сохранено, список обновит следующий опрос. */
    }
  }

  async function editMessage(message: Message, body: string) {
    const version = revision;
    await request(`/api/messages/${message.id}`, "PATCH", { body });
    if (version === revision)
      messages.value = messages.value.map((item) =>
        item.id === message.id ? { ...item, body } : item,
      );
  }
  async function deleteMessage(message: Message) {
    const version = revision;
    await request(`/api/messages/${message.id}`, "DELETE");
    if (version === revision)
      messages.value = messages.value.filter((item) => item.id !== message.id);
  }
  return {
    chats,
    messages,
    activeChat,
    reset,
    initialize,
    selectChat,
    refresh,
    sendMessage,
    sendImage,
    editMessage,
    deleteMessage,
    writeUser,
    createGroup,
    createChannel: (value: ChannelUpdate) =>
      openChannel("/api/channels", value),
    subscribeChannel: (id: number) =>
      openChannel(`/api/channels/${id}/subscription`),
    leaveChannel,
    updateChat,
    removeChat,
  };
}
