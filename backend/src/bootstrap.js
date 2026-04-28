import { migrate, query } from "./db.js";
import { seedInitialData } from "./seed.js";

let bootPromise;

export function ensureInitialData() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await migrate();
      const result = await query("SELECT COUNT(*)::int AS count FROM users");
      if (result.rows[0].count === 0) {
        await seedInitialData();
      }
    })();
  }

  return bootPromise;
}
