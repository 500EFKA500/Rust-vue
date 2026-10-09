export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export function text(value, max, label, required = false) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(400, `Некорректное поле «${label}».`);
  return value.trim();
}
export async function jsonBody(req, limit = 12 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail(413, "Файл слишком большой.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Ожидается объект JSON.");
    return value;
  } catch {
    fail(400, "Некорректный JSON.");
  }
}
