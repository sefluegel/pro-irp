// frontend/src/lib/api.js
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export function saveToken(t) { localStorage.setItem("token", t); }
export function getToken()    { return localStorage.getItem("token"); }
export function clearToken()  { localStorage.removeItem("token"); }

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function http(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(opts.headers || {}),
    ...authHeaders(),
    ...(!isForm && opts.body ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (res.status === 401) {
    clearToken();
    throw new Error(typeof data === "string" ? data : data.error || "Unauthorized");
  }
  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : data.error || res.statusText);
  }
  return data;
}

export const api = {
  // Auth
  signup(body) { return http("/auth/signup", { method: "POST", body: JSON.stringify(body) }); },
  login(body)  { return http("/auth/login",  { method: "POST", body: JSON.stringify(body) }); },

  // Health/version
  health()  { return http("/health"); },
  version() { return http("/version"); },

  // Clients
  listClients()            { return http("/clients"); },
  createClient(b)          { return http("/clients", { method: "POST", body: JSON.stringify(b) }); },
  updateClient(id, b)      { return http(`/clients/${id}`, { method: "PUT", body: JSON.stringify(b) }); },
  deleteClient(id)         { return http(`/clients/${id}`, { method: "DELETE" }); },

  // Comms
  listComms(clientId)      { return http(`/comms/${clientId}`); },
  addComm(clientId, b)     { return http(`/comms/${clientId}`, { method: "POST", body: JSON.stringify(b) }); },

  // Tasks
  listTasks()              { return http("/tasks"); },
  createTask(b)            { return http("/tasks", { method: "POST", body: JSON.stringify(b) }); },
  completeTask(id)         { return http(`/tasks/${id}/complete`, { method: "PATCH" }); },
  autoThreshold(b)         { return http("/tasks/auto/threshold", { method: "POST", body: JSON.stringify(b) }); },

  // Risk
  scoreRisk(b)             { return http("/risk/score", { method: "POST", body: JSON.stringify(b) }); },

  // Files
  listFiles()              { return http("/files"); },
  async uploadFile(file) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${API_URL}/files`, { method: "POST", headers: { ...authHeaders() }, body: fd });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
};
