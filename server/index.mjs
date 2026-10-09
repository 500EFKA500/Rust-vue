import { resolve } from "node:path";
import { openDatabase } from "./database.mjs";
import { createApp } from "./app.mjs";

const db = openDatabase(process.env.DATABASE_PATH ?? resolve("server/data/messenger.db"));
const options = process.env.ALLOWED_ORIGINS
  ? { origins: process.env.ALLOWED_ORIGINS.split(",") }
  : {};
const server = createApp(db, options);
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3001);
server.listen(port, host, () => console.log(`DesireMes API: http://${host}:${port}`));
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
