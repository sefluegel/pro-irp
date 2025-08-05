// frontend/src/services/api.js
const API_ROOT = process.env.REACT_APP_API_ROOT;

async function request(path, method = 'GET', data) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: data ? JSON.stringify(data) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

export function signup(email, password) {
  return request('/signup', 'POST', { email, password });
}

export function login(email, password) {
  return request('/login', 'POST', { email, password });
}

export function getClients() {
  return request('/clients');
}

export function createClient(client) {
  return request('/clients', 'POST', client);
}

export function updateClient(client) {
  return request('/clients', 'PUT', client);
}

export function deleteClient(clientId) {
  return request('/clients', 'DELETE', { clientId });
}
