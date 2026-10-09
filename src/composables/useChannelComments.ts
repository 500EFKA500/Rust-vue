import { onMounted, onUnmounted, ref } from "vue";
import { request } from "../services/api";
import type { ChannelComment } from "../types/channel";
export function useChannelComments(postId: number, changed: () => void) {
  const comments = ref<ChannelComment[]>([]);
  const enabled = ref(true);
  const error = ref("");
  const busy = ref(false);
  const loading = ref(true);
  let alive = true;
  let fetching = false;
  let revision = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  async function load() {
    if (fetching || busy.value || !alive) return;
    fetching = true;
    const version = revision;
    try {
      const response = await request<{
        enabled: boolean;
        comments: ChannelComment[];
      }>(`/api/posts/${postId}/comments`);
      if (!alive || version !== revision) return;
      enabled.value = response.enabled;
      comments.value = response.comments;
      error.value = "";
    } catch (cause) {
      if (alive && version === revision)
        error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      fetching = false;
      loading.value = false;
    }
  }
  async function mutate(path: string, method: string, body?: unknown) {
    if (busy.value || !alive) return false;
    busy.value = true;
    error.value = "";
    revision++;
    try {
      await request(path, method, body);
      if (!alive) return true;
      changed();
      return true;
    } catch (cause) {
      if (alive)
        error.value = cause instanceof Error ? cause.message : String(cause);
      return false;
    } finally {
      busy.value = false;
      if (alive && !error.value) void load();
    }
  }
  onMounted(() => {
    void load();
    timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 3000);
  });
  onUnmounted(() => {
    alive = false;
    clearInterval(timer);
  });
  return {
    comments,
    enabled,
    error,
    busy,
    loading,
    load,
    send: (body: string) =>
      mutate(`/api/posts/${postId}/comments`, "POST", { body }),
    edit: (id: number, body: string) =>
      mutate(`/api/comments/${id}`, "PATCH", { body }),
    remove: (id: number) => mutate(`/api/comments/${id}`, "DELETE"),
  };
}
