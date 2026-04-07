import { app } from "./app.js";
import { ensureDemoData } from "./bootstrap.js";
import { closePool } from "./db.js";

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await ensureDemoData();
  const server = app.listen(PORT, () => {
    console.log(`Attendance demo backend berjalan di http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch(async (error) => {
  console.error("Gagal bootstrap backend:", error);
  await closePool();
  process.exit(1);
});
