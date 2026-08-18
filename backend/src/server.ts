import { createApp } from "./app";
import { env } from "./config/env";
import { closePool } from "./db/pool";

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`VITELSA GlassLab API escuchando en http://localhost:${env.port}/api`);
});

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} recibido, cerrando…`);
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
