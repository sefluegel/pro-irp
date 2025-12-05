export function setToken(t) {
  try { localStorage.setItem("token", t); } catch {}
}
export function getToken() {
  try { return localStorage.getItem("token"); } catch {}
  return null;
}
export function clearToken() {
  try { localStorage.removeItem("token"); } catch {}
}
