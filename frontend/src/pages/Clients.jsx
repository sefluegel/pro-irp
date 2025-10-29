// src/pages/Clients.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import AddClientModal from "../components/AddClientModal";

// Little UI helpers that match your existing style
const Badge = ({ children, tone = "gray" }) => {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
};

const OwnerChip = ({ name = "You" }) => (
  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
    {name}
  </span>
);

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Load live data
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

  // Search filter
  const filtered = useMemo(() => {
    if (!q) return clients;
    const needle = q.toLowerCase();
    return clients.filter((c) => {
      const hay = `${c.name || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [clients, q]);

  // Handlers
  function openAddModal() { setShowAdd(true); }
  function closeAddModal() { setShowAdd(false); }

  async function handleCreateClient(body) {
    const created = await api.createClient(body);
    setClients((prev) => [created, ...prev]);
  }

  async function deleteClient(id) {
    if (!window.confirm("Delete this client?")) return;
    await api.deleteClient(id);
    setClients((prev) => prev.filter((c) => String(c.id) !== String(id)));
  }

  function openClient(c) { navigate(`/clients/${c.id}`); }

  // Export CSV
  function exportCsv() {
    const rows = [
      [
        "name","email","phone","address","effectiveDate","language","carrier","plan",
        "primaryCare","tags","status","risk","lastActivity","owner"
      ],
      ...clients.map((c) => [
        c.name || "",
        c.email || "",
        c.phone || "",
        c.address || "",
        c.effectiveDate || "",
        c.language || "",
        c.carrier || "",
        c.plan || "",
        c.primaryCare || "",
        Array.isArray(c.tags) ? c.tags.join("|") : "",
        c.status || "",
        c.risk || "",
        c.lastActivity || "",
        c.owner || "You",
      ]),
    ];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clients.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Import CSV (expects same headers as export)
  function triggerImport() { fileInputRef.current?.click(); }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;

    const header = lines.shift().split(",").map(h => h.replace(/^"|"$/g, ""));
    const idx = (k) => header.indexOf(k);

    for (const line of lines) {
      const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map(s => s.replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
      const body = {
        name: cols[idx("name")] || "",
        email: cols[idx("email")] || undefined,
        phone: cols[idx("phone")] || undefined,
        address: cols[idx("address")] || undefined,
        effectiveDate: cols[idx("effectiveDate")] || undefined,
        language: cols[idx("language")] || undefined,
        carrier: cols[idx("carrier")] || undefined,
        plan: cols[idx("plan")] || undefined,
        primaryCare: cols[idx("primaryCare")] || undefined,
        tags: (cols[idx("tags")] || "").split("|").map(s => s.trim()).filter(Boolean),
        status: cols[idx("status")] || "Active",
        risk: cols[idx("risk")] || undefined,
        lastActivity: cols[idx("lastActivity")] || undefined,
        owner: cols[idx("owner")] || "You",
      };
      const created = await api.createClient(body);
      setClients((prev) => [created, ...prev]);
    }

    e.target.value = ""; // reset for next import
  }

  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Clients</h1>
          <p className="text-gray-500">All your clients, prospects & contacts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg bg-[#FFB800] text-[#172A3A] font-semibold shadow-sm hover:brightness-95"
          >
            + Add Client
          </button>
          <button onClick={triggerImport} className="px-3 py-2 rounded border">Import</button>
          <button onClick={exportCsv} className="px-3 py-2 rounded border">Export</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <button className="px-3 py-2 rounded border text-sm">🗑️ Delete</button>
        <button className="px-3 py-2 rounded border text-sm">✉️ Email</button>
        <button className="px-3 py-2 rounded border text-sm">💬 SMS</button>

        <div className="ml-auto flex items-center gap-3">
          <button className="px-3 py-2 rounded border text-sm">Columns</button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="pl-3 pr-3 py-2 border rounded w-56 text-sm"
          />
          <button className="px-3 py-2 rounded border text-sm">More Filters</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0F2336] text-white/90">
              <th className="p-3 w-8"><input type="checkbox" /></th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Last Activity</th>
              <th className="p-3 text-left">Tags</th>
              <th className="p-3 text-left">Risk</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left w-28"> </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="p-4 text-gray-400">Loading…</td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="p-4 text-gray-400">No clients yet.</td>
              </tr>
            )}

            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                {/* Checkbox */}
                <td className="p-3 align-top">
                  <input type="checkbox" />
                </td>

                {/* Name + initials avatar */}
                <td className="p-3 align-top">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#0F2336] text-[#FFB800] grid place-items-center text-xs font-bold">
                      {(c.name || "??")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <button
                      className="text-[#172A3A] font-semibold hover:underline"
                      onClick={() => openClient(c)}
                    >
                      {c.name || "(no name)"}
                    </button>
                  </div>
                </td>

                {/* Phone */}
                <td className="p-3 align-top">{c.phone || "—"}</td>

                {/* Email */}
                <td className="p-3 align-top">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="text-[#172A3A] hover:underline">{c.email}</a>
                  ) : "—"}
                </td>

                {/* Created */}
                <td className="p-3 align-top">{fmtDate(c.created)}</td>

                {/* Last Activity */}
                <td className="p-3 align-top">
                  {c.lastActivity ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 bg-indigo-200 rounded-sm" />
                      <span className="text-gray-600">{c.lastActivity}</span>
                    </div>
                  ) : "—"}
                </td>

                {/* Tags */}
                <td className="p-3 align-top">
                  {Array.isArray(c.tags) && c.tags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t, i) => (
                        <Badge key={i} tone="blue">{t}</Badge>
                      ))}
                    </div>
                  ) : "—"}
                </td>

                {/* Risk */}
                <td className="p-3 align-top">
                  {c.risk ? (
                    <Badge tone={c.risk === "High" ? "red" : c.risk === "Low" ? "green" : "yellow"}>
                      {c.risk}
                    </Badge>
                  ) : "—"}
                </td>

                {/* Status */}
                <td className="p-3 align-top">
                  {c.status ? (
                    <Badge tone={c.status === "Active" ? "green" : "yellow"}>{c.status}</Badge>
                  ) : <Badge tone="green">Active</Badge>}
                </td>

                {/* Owner */}
                <td className="p-3 align-top"><OwnerChip name={c.owner || "You"} /></td>

                {/* Row actions */}
                <td className="p-3 align-top">
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-1 rounded border" onClick={() => deleteClient(c.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-3 text-sm text-gray-400">Total {clients.length} records</div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={showAdd}
        onClose={closeAddModal}
        onCreate={handleCreateClient}
      />
    </div>
  );
};

export default Clients;

