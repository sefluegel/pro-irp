const BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

// Ping API health
export async function apiHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) throw new Error(`Health failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Clients
export async function getClients() {
  const res = await fetch(`${BASE}/clients`);
  if (!res.ok) throw new Error(`GET /clients failed: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function addClient(payload) {
  const res = await fetch(`${BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST /clients failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// keep older imports working
export { getClients as fetchClients };
