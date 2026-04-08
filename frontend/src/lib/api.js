import { clearSession } from "./session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("attendance-demo-token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    throw new ApiError(body.message || "Permintaan gagal diproses.", response.status);
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv")) {
    return response.text();
  }
  return response.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE"
    })
};
