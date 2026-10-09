import { onUnmounted, ref, watch, type Ref } from "vue";
import type { User } from "../types/user";
import { defaultAppearance, type Appearance } from "../types/appearance";

export function useAppearance(user: Ref<User | null>) {
  const preview = ref<Appearance | null>(null);
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const systemDark = ref(scheme.matches);
  function onSystemTheme(event: MediaQueryListEvent) {
    systemDark.value = event.matches;
  }
  scheme.addEventListener("change", onSystemTheme);
  watch(
    () => user.value?.id,
    () => {
      preview.value = null;
    },
  );
  watch(
    [() => user.value?.appearance, preview, systemDark],
    () => {
      const settings = preview.value ?? user.value?.appearance ?? defaultAppearance;
      const root = document.documentElement;
      root.dataset.theme =
        settings.theme === "system"
          ? systemDark.value
            ? "dark"
            : "light"
          : settings.theme;
      root.dataset.accent = settings.accent;
      root.dataset.background = settings.background;
      root.dataset.compact = String(settings.compact);
      root.style.setProperty("--message-font-size", settings.fontSize + "px");
    },
    { immediate: true },
  );
  onUnmounted(() => scheme.removeEventListener("change", onSystemTheme));
  return { preview };
}
