import serverless from "serverless-http";
import { app } from "../../backend/src/app.js";
import { ensureDemoData } from "../../backend/src/bootstrap.js";

const proxy = serverless(app);

export async function handler(event, context) {
  await ensureDemoData();
  const splat = event.pathParameters?.splat || "";
  const normalizedPath = splat ? `/api/${splat}` : "/api";
  return proxy(
    {
      ...event,
      path: normalizedPath,
      rawUrl: event.rawUrl || normalizedPath
    },
    context
  );
}
