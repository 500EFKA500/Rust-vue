-- Таблица пользователей мессенджера.
-- Она создаётся пустой: записи будут добавляться отдельным экраном или SQL-запросом.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
