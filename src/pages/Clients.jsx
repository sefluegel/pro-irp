// frontend/src/components/Clients.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, UploadCloud, Download, Search, Filter, MoreHorizontal,
  Edit2, Mail, MessageCircle, Phone, Trash2, SlidersHorizontal, X
} from "lucide-react";
import { fetchClients, addClient } from "../api";

// color helpers (same as before)
const RISK_COLORS = {
  High: "bg-red-200 text-red-800",
  Medium: "bg-yellow-200 text-yellow-800",
  Low: "bg-green-200 text-green-800",
};
const TAG_COLORS = {
  MAPD: "bg-blue-100 text-blue-800",
  PDP: "bg-yellow-100 text-yellow-800",
  "D-SNP": "bg-purple-100 text-purple-800",
  "Hot Lead": "bg-pink-100 text-pink-800",
};
const STATUS_COLORS = {
  Active: "bg-green-100 text-green-800",
  Prospect: "bg-yellow-100 text-yellow-800",
  Inactive: "bg-gray-100 text-gray-700",
};

const columnDefs = [
  { key: "select", label: "", width: "w-6" },
  { key: "initials", label: "", width: "w-10" },
  { key: "name", label: "Name", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "created", label: "Created", sortable: true },
  { key: "lastActivity", label: "Last Activity", sortable: true },
  { key: "tags", label: "Tags" },
  { key: "risk", label: "Risk" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "actions", label: "", width: "w-8" },
];

// map an API client into a table row
function mapApiToRow(c) {
  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
  const initials = (c.firstName?.[0] || "?") + (c.lastName?.[0] || "");
  return {
    id: c.id,
    name,
    initials: initials.toUpperCase(),
    phone: c.phone || "—",
    email: c.email || "—",
    created: new Date(c.createdAt || Date.now()).toLocaleDateString(),
    lastActivity: "—",
    tags: [],
    risk: "Medium",
    status: "Active",
    owner: "You",
    unread: false,
  };
}

const Clients = () => {
  // table state
  const [clients, setClients] = useState([]);         // will be loaded from API
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(columnDefs.map(c => c.key));

  // ui state
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState("");
  const fileInput = useRef();

  // add-client modal state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // load from API once
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchClients();          // [{id, firstName, ...}]
        setClients(data.map(mapApiToRow));
      } catch (e) {
        setErr(e.message || "Failed to load clients");
      }
    })();
  }, []);

  const handleSelectAll = e =>
    setSelected(e.target.checked ? clients.map(c => c.id) : []);
  const handleSelect = id =>
    setSelected(sel => (sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]));
  const handleBulkDelete = () => {
    setClients(cs => cs.filter(c => !selected.includes(c.id)));
    setSelected([]);
  };

  const filteredClients = clients.filter(c =>
    search === "" ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // save from modal -> POST /clients
  async function saveNewClient(e) {
    e.preventDefault();
    setErr("");
    if (!firstName.trim() || !lastName.trim()) {
      setErr("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await addClient({ firstName, lastName, email, phone, notes });
      // show the new row at the top
      setClients(prev => [mapApiToRow(created), ...prev]);
      // clear + close modal
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setNotes("");
      setShowAdd(false);
    } catch (e) {
      setErr(e.message || "Failed to add client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#172A3A]">Clients</h1>
          <p className="text-gray-500">All your clients, prospects & contacts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition"
          >
            <Plus size={18} /> Add Client
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition"
          >
            <UploadCloud size={18} /> Import
          </button>
          <button
            onClick={() => alert("Exporting CSV...")}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            disabled={!selected.length}
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            disabled={!selected.length}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <Mail size={14} /> Email
          </button>
          <button
            disabled={!selected.length}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <MessageCircle size={14} /> SMS
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setColumns(cols =>
              cols.includes("actions") ? columnDefs.map(c => c.key) : cols)}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <SlidersHorizontal size={14} /> Columns
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="pl-8 pr-2 py-1 rounded border shadow-sm text-xs"
            />
          </div>
          <button
            onClick={() => alert("Filters coming soon")}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <Filter size={14} /> More Filters
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-4 p-3 border rounded bg-red-50 text-red-700">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white border rounded shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#172A3A] text-white">
            <tr>
              {columnDefs
                .filter(c => columns.includes(c.key))
                .map(col => (
                  <th key={col.key} className={`py-2 px-2 ${col.width || ""}`} style={{ minWidth: 50 }}>
                    {col.key === "select" ? (
                      <input
                        type="checkbox"
                        checked={selected.length === filteredClients.length && filteredClients.length > 0}
                        onChange={handleSelectAll}
                      />
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-400">
                  No clients found.
                </td>
              </tr>
            )}
            {filteredClients.map(c => (
              <tr key={c.id} className={`border-b ${c.unread ? "bg-blue-50" : ""} hover:bg-yellow-50`}>
                {columns.includes("select") && (
                  <td className="py-1 px-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => handleSelect(c.id)}
                    />
                  </td>
                )}
                {columns.includes("initials") && (
                  <td className="py-1 px-2">
                    <div className="w-7 h-7 rounded-full bg-[#172A3A] text-white flex items-center justify-center font-bold text-xs border-2 border-[#FFB800]">
                      {c.initials}
                    </div>
                  </td>
                )}
                {columns.includes("name") && (
                  <td className="py-1 px-2">
                    <Link to={`/clients/${c.id}`} className="font-bold text-[#172A3A] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                )}
                {columns.includes("phone") && <td className="py-1 px-2">{c.phone}</td>}
                {columns.includes("email") && (
                  <td className="py-1 px-2 flex items-center gap-1">
                    <Mail size={14} className="text-[#FFB800]" /> {c.email}
                  </td>
                )}
                {columns.includes("created") && <td className="py-1 px-2">{c.created}</td>}
                {columns.includes("lastActivity") && <td className="py-1 px-2">{c.lastActivity}</td>}
                {columns.includes("tags") && (
                  <td className="py-1 px-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        c.tags.map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              TAG_COLORS[tag] || "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                )}
                {columns.includes("risk") && (
                  <td className="py-1 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RISK_COLORS[c.risk]}`}>
                      {c.risk}
                    </span>
                  </td>
                )}
                {columns.includes("status") && (
                  <td className="py-1 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                )}
                {columns.includes("owner") && <td className="py-1 px-2">{c.owner}</td>}
                {columns.includes("actions") && (
                  <td className="py-1 px-2 text-right">
                    <div className="flex gap-2">
                      <Edit2 size={16} className="text-gray-500 hover:text-blue-800" />
                      <Phone size={16} className="text-gray-500 hover:text-blue-800" />
                      <MessageCircle size={16} className="text-gray-500 hover:text-blue-800" />
                      <MoreHorizontal size={16} className="text-gray-500 hover:text-blue-800" />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <div> Total {filteredClients.length} record{filteredClients.length !== 1 && "s"} </div>
        <div className="flex gap-1">
          <button className="px-2 py-1 rounded hover:bg-gray-100">{"<"}</button>
          <span>1</span>
          <button className="px-2 py-1 rounded hover:bg-gray-100">{">"}</button>
        </div>
      </div>

      {/* Add Client Modal (real POST) */}
      {showAdd && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-[95vw] p-6 relative">
            <button className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black" onClick={() => setShowAdd(false)}>
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-[#172A3A] mb-2">Add Client</h2>
            <form className="space-y-2" onSubmit={saveNewClient}>
              <div className="flex gap-2">
                <input className="w-1/2 px-3 py-2 border rounded text-sm" placeholder="First name *"
                       value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <input className="w-1/2 px-3 py-2 border rounded text-sm" placeholder="Last name *"
                       value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Phone"
                     value={phone} onChange={e => setPhone(e.target.value)} />
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Email"
                     value={email} onChange={e => setEmail(e.target.value)} />
              <textarea className="w-full px-3 py-2 border rounded text-sm" rows={3} placeholder="Notes"
                        value={notes} onChange={e => setNotes(e.target.value)} />
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold py-2 rounded-xl shadow disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal (unchanged/demo) */}
      {showImport && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[430px] max-w-[98vw] p-6 relative">
            <button className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black" onClick={() => setShowImport(false)}>
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-[#172A3A] mb-3">Import Clients</h2>
            <p className="text-gray-500 text-xs mb-4">Upload a CSV; mapping not implemented.</p>
            <input type="file" accept=".csv" ref={fileInput} onChange={() => setShowImport(false)} className="mb-2" />
            <button
              className="w-full bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-4 py-2 rounded-xl font-bold shadow transition"
              onClick={() => fileInput.current && fileInput.current.click()}
            >
              Select CSV File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
