import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { defaultAppearance, type Appearance } from "../types/appearance";
import type { User } from "../types/user";

type Change = { userId: number; value: Appearance };
export function useAppearanceAutosave(
  user: Ref<User | null>,
  preview: Ref<Appearance | null>,
  save: (value: Appearance, userId: number) => Promise<void>,
) {
  const state = ref<"idle" | "waiting" | "saving" | "saved" | "error">("idle");
  const error = ref("");
  const pending = ref(false);
  const saved = new Map<number, string>();
  let queued: Change | null = null;
  let task: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const status = computed(
    () =>
      ({
        idle: "Изменения сохраняются автоматически",
        waiting: "Изменения сохраняются автоматически…",
        saving: "Сохранение…",
        saved: "Все изменения сохранены",
        error: "Не удалось сохранить изменения",
      })[state.value],
  );

  watch(
    () => user.value?.id,
    (id, previousId) => {
      if (previousId !== undefined && id !== previousId) {
        // При истечении сессии очередь старого профиля не блокирует новый вход.
        clearTimeout(timer);
        queued = null;
        pending.value = false;
        state.value = "idle";
        error.value = "";
      }
      if (user.value)
        saved.set(
          user.value.id,
          JSON.stringify(user.value.appearance ?? defaultAppearance),
        );
      if (!task && !queued) {
        state.value = "idle";
        error.value = "";
      }
    },
    { immediate: true },
  );
  watch(
    () => user.value?.appearance,
    (value) => {
      if (user.value && !pending.value && !task)
        saved.set(user.value.id, JSON.stringify(value ?? defaultAppearance));
    },
  );

  function change(value: Appearance) {
    if (!user.value) return;
    preview.value = { ...value };
    queued = { userId: user.value.id, value: { ...value } };
    pending.value = true;
    error.value = "";
    state.value = task ? "saving" : "waiting";
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, 450);
  }

  async function drain() {
    while (queued) {
      const change = queued;
      queued = null;
      const snapshot = JSON.stringify(change.value);
      if (saved.get(change.userId) !== snapshot) {
        state.value = "saving";
        try {
          await save(change.value, change.userId);
          saved.set(change.userId, snapshot);
        } catch (cause) {
          if (user.value?.id !== change.userId) continue;
          // Не теряем последнее изменение. Повторная попытка — при следующем
          // изменении, восстановлении сети или явном повторе после ошибки.
          queued ??= change;
          state.value = "error";
          error.value = cause instanceof Error ? cause.message : String(cause);
          return false;
        }
      }
    }
    pending.value = false;
    state.value = user.value ? "saved" : "idle";
    error.value = "";
    preview.value = null;
    return true;
  }

  function flush(): Promise<boolean> {
    clearTimeout(timer);
    if (task) return task;
    if (!queued) return Promise.resolve(true);
    task = (async () => {
      try {
        return await drain();
      } finally {
        task = null;
      }
    })();
    return task;
  }

  function onOnline() {
    if (pending.value) void flush();
  }
  window.addEventListener("online", onOnline);
  onUnmounted(() => {
    clearTimeout(timer);
    window.removeEventListener("online", onOnline);
    // Очередь принадлежит App, а не вкладке: закрытие окна настроек её не удаляет.
    void flush();
  });
  return { change, flush, pending, status, error };
}
