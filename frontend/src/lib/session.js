const TOKEN_KEY = "attendance-demo-token";
const USER_KEY = "attendance-demo-user";
const NOTICE_KEY = "attendance-demo-notice";

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  localStorage.setItem(NOTICE_KEY, session.demoNotice || "");
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NOTICE_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getDemoNotice() {
  return localStorage.getItem(NOTICE_KEY) || "";
}
