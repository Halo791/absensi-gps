import serverless from "serverless-http";
import { app } from "../../backend/src/app.js";
import { ensureDemoData } from "../../backend/src/bootstrap.js";

const proxy = serverless(app);

function normalizeApiPath(event) {
  const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : event.path || "";

  if (rawPath.startsWith("/api")) {
    return rawPath;
  }

  if (rawPath.startsWith("/.netlify/functions/api")) {
    const rewritten = rawPath.replace("/.netlify/functions/api", "/api");
    return rewritten || "/api";
  }

  const splat = event.pathParameters?.splat || "";
  return splat ? `/api/${splat}` : "/api";
}

export async function handler(event, context) {
  await ensureDemoData();
  const normalizedPath = normalizeApiPath(event);
  return proxy(
    {
      ...event,
      path: normalizedPath,
      rawUrl: event.rawUrl || normalizedPath
    },
    context
  );
}
