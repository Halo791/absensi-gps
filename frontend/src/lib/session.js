const USER_KEY = "ingenio-user";

export function saveSession(session) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
