// src/auth/session.js

export function setCurrentUser(user) {
  const session = {
    ...user,
    sessionExpiry: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
  };
  localStorage.setItem("currentSession", JSON.stringify(session));
  window.currentUser = session;
}

export function getCurrentUser() {
  if (window.currentUser) return window.currentUser;

  const raw = localStorage.getItem("currentSession");
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (session.sessionExpiry > Date.now()) {
      window.currentUser = session;
      return session;
    } else {
      localStorage.removeItem("currentSession");
      return null;
    }
  } catch (e) {
    console.warn("Corrupted session:", e);
    localStorage.removeItem("currentSession");
    return null;
  }
}
