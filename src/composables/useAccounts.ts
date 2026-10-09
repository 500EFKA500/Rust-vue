import { computed, ref } from "vue";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { API_URL, ApiError, request, setSessionToken } from "../services/api";
import type {
  AccountSession,
  AccountVault,
  Credentials,
} from "../types/account";
import type { User, ProfileUpdate } from "../types/user";
import type { Appearance } from "../types/appearance";

export function useAccounts() {
  const accounts = ref<AccountSession[]>([]);
  const currentUser = ref<User | null>(null);
  const loading = ref(true);
  const busy = ref(false);
  const error = ref("");
  const savedUsers = computed(() =>
    accounts.value.map((account) => account.user),
  );

  async function persist() {
    if (!isTauri()) return; // В браузерном предпросмотре токены живут только в памяти.
    const value: AccountVault = {
      server: API_URL,
      activeId: currentUser.value?.id ?? null,
      accounts: accounts.value,
    };
    await invoke("save_account_vault", { value: JSON.stringify(value) });
  }

  async function activate(user: User) {
    const account = accounts.value.find((item) => item.user.id === user.id);
    if (!account) throw new Error("Сначала войдите в этот аккаунт.");
    try {
      const profile = await request<User>(
        "/api/auth/me",
        "GET",
        undefined,
        account.token,
      );
      account.user = profile;
      currentUser.value = profile;
      setSessionToken(account.token);
      await persist();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        accounts.value = accounts.value.filter((item) => item !== account);
        if (currentUser.value?.id === user.id) {
          currentUser.value = null;
          setSessionToken("");
        }
        await persist();
      }
      throw cause;
    }
  }

  async function initialize() {
    error.value = "";
    loading.value = true;
    try {
      if (isTauri()) {
        const value: AccountVault | null = JSON.parse(
          await invoke<string>("load_account_vault"),
        );
        if (value?.server === API_URL && Array.isArray(value.accounts)) {
          accounts.value = value.accounts.filter(
            (item) => item.expiresAt > Date.now(),
          );
          const active =
            accounts.value.find((item) => item.user.id === value.activeId) ??
            accounts.value[0];
          if (active) await activate(active.user);
        }
      }
    } catch (cause) {
      error.value = String(cause instanceof Error ? cause.message : cause);
    } finally {
      loading.value = false;
    }
  }

  async function authenticate(
    mode: "login" | "register",
    credentials: Credentials,
  ) {
    busy.value = true;
    error.value = "";
    try {
      const session = await request<AccountSession>(
        `/api/auth/${mode}`,
        "POST",
        credentials,
        "",
      );
      accounts.value = [
        ...accounts.value.filter((item) => item.user.id !== session.user.id),
        session,
      ];
      currentUser.value = session.user;
      setSessionToken(session.token);
      await persist();
      return true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function logout() {
    await request("/api/auth/logout", "POST", {});
    accounts.value = accounts.value.filter(
      (item) => item.user.id !== currentUser.value?.id,
    );
    currentUser.value = null;
    setSessionToken("");
    await persist();
    if (accounts.value[0]) await activate(accounts.value[0].user);
  }

  async function updateProfile(profile: ProfileUpdate) {
    const user = await request<User>("/api/profile", "PATCH", profile);
    currentUser.value = user;
    const account = accounts.value.find((item) => item.user.id === user.id);
    if (account) account.user = user;
    await persist();
  }

  async function updateAppearance(
    appearance: Appearance,
    userId = currentUser.value?.id,
  ) {
    const account = accounts.value.find((item) => item.user.id === userId);
    if (!account) throw new Error("Сначала войдите в аккаунт.");
    const user = await request<User>(
      "/api/appearance",
      "PATCH",
      appearance,
      account.token,
    );
    // Ответ оформления не должен откатывать имя/аватар или переключать аккаунт.
    account.user = { ...account.user, appearance: user.appearance };
    if (currentUser.value?.id === user.id) {
      currentUser.value = { ...currentUser.value, appearance: user.appearance };
    }
    await persist();
  }

  async function expireCurrent() {
    accounts.value = accounts.value.filter(
      (item) => item.user.id !== currentUser.value?.id,
    );
    currentUser.value = null;
    setSessionToken("");
    await persist();
    error.value = "Сессия завершена. Войдите снова.";
  }

  return {
    currentUser,
    savedUsers,
    loading,
    busy,
    error,
    initialize,
    authenticate,
    activate,
    logout,
    updateProfile,
    updateAppearance,
    expireCurrent,
  };
}
