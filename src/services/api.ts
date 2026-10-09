import { invoke, isTauri } from "@tauri-apps/api/core";

const url = new URL(import.meta.env.VITE_API_URL || "http://127.0.0.1:3001");
if (
  url.protocol !== "https:" &&
  !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
) {
  throw new Error("Для удалённого сервера требуется HTTPS.");
}
export const API_URL = url.origin;
let sessionToken = "";
export function setSessionToken(token: string) {
  sessionToken = token;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token = sessionToken,
): Promise<T> {
  try {
    const response = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(data.error || "Ошибка сервера.", response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Нет связи с сервером. Проверьте подключение и запуск сервера.");
  }
}

export async function uploadAttachment(path: string) {
  if (path.startsWith("/media/") || path.startsWith("/api/uploads/")) return path;
  const image = path.startsWith("data:image/")
    ? path
    : isTauri()
      ? await invoke<string>("read_attachment", { path })
      : "";
  if (!image) throw new Error("Выберите изображение в приложении.");
  return (await request<{ path: string }>("/api/uploads", "POST", { image })).path;
}

export async function loadProtectedImage(path: string) {
  if (!/^\/api\/uploads\/[a-f0-9-]{36}$/.test(path))
    throw new Error("Некорректный адрес изображения.");
  const response = await fetch(API_URL + path, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Не удалось загрузить изображение.");
  return URL.createObjectURL(await response.blob());
}
