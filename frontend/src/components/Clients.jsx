import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listClients();
        if (!cancelled) setClients(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = clients.filter((c) => {
    if (!q) return true;
    const s = `${c.name||""} ${c.email||""} ${c.phone||""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  async function addClient() {
    const name = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    const phone = phoneRef.current?.value?.trim();
    if (!name) return alert("Name is required");
    try {
      const created = await api.createClient({ name, email, phone, status: "Active" });
      setClients((prev) => [created, ...prev]);
      if (nameRef.current) nameRef.current.value = "";
      if (emailRef.current) emailRef.current.value = "";
      if (phoneRef.current) phoneRef.current.value = "";
    } catch (e) {
      alert("Create failed: " + e.message);
    }
  }

  async function removeClient(id) {
    if (!window.confirm("Delete this client?")) return;
    await api.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  function openClient(c) {
    navigate(`/clients/${c.id}`);
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={addClient}>
            + Add Client
          </button>
          <button className="px-3 py-2 rounded border">Import</button>
          <button className="px-3 py-2 rounded border">Export</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input ref={nameRef} placeholder="Name" className="border rounded px-2 py-1" />
        <input ref={emailRef} placeholder="Email" className="border rounded px-2 py-1" />
        <input ref={phoneRef} placeholder="Phone" className="border rounded px-2 py-1" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="ml-auto border rounded px-2 py-1"
        />
      </div>

      <div className="bg-white rounded-2xl shadow">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500">
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">Created</th>
              <th className="p-3">Last Activity</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-3 text-sm text-gray-400" colSpan={6}>Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="p-3 text-sm text-gray-400" colSpan={6}>No clients yet.</td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <button className="text-indigo-700 hover:underline" onClick={() => openClient(c)}>
                    {c.name || "(no name)"}
                  </button>
                </td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">{c.email || "—"}</td>
                <td className="p-3">{c.created ? new Date(c.created).toLocaleDateString() : "—"}</td>
                <td className="p-3">{c.lastActivity ? c.lastActivity : "—"}</td>
                <td className="p-3">
                  <button className="px-2 py-1 rounded border mr-2" onClick={() => openClient(c)}>Open</button>
                  <button className="px-2 py-1 rounded border" onClick={() => removeClient(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-sm text-gray-400">Total {clients.length} records</div>
      </div>
    </div>
  );
};

export default Clients;

