// CURRENT_TIMESTAMP в серверной SQLite хранится в UTC без суффикса зоны.
export function messageDate(value: string) {
  const normalized = value.replace(" ", "T");
  return new Date(
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : normalized + "Z",
  );
}
export function dateKey(value: string) {
  const date = messageDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateLabel(key: string) {
  if (!key) return "Дата неизвестна";
  const date = new Date(key + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}
export function messageTime(value: string) {
  const date = messageDate(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
