import { isDemoMode } from "./config.js";
import { DEMO_ADMIN, DEMO_EMPLOYEE } from "./constants.js";
import { migrate } from "./db.js";
import { getUserByNik } from "./repository.js";
import { resetDemoData } from "./seed.js";

let bootPromise;

export function ensureDemoData() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await migrate();
      if (!isDemoMode) {
        return;
      }
      const admin = await getUserByNik(DEMO_ADMIN.nik);
      const employee = await getUserByNik(DEMO_EMPLOYEE.nik);
      if (!admin || !employee) {
        await resetDemoData();
      }
    })();
  }

  return bootPromise;
}
