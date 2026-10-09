export const defaultAppearance = {
  theme: "dark",
  accent: "blue",
  fontSize: 14,
  background: "plain",
  compact: false,
};
export function getAppearance(db, userId) {
  const row = db
    .prepare("SELECT * FROM appearance_settings WHERE user_id = ?")
    .get(userId);
  return row
    ? {
        theme: row.theme,
        accent: row.accent,
        fontSize: row.font_size,
        background: row.background,
        compact: Boolean(row.compact),
      }
    : { ...defaultAppearance };
}
