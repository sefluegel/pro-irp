// /frontend/src/pages/Clients.jsx
import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, UploadCloud, Download, Search, Filter, MoreHorizontal,
  Edit2, Mail, MessageCircle, Phone, Trash2, UserPlus,
  SlidersHorizontal, ChevronDown, X, Eye, Check, Star
} from "lucide-react";

// Demo clients for table (front-end only)
const DEMO_CLIENTS = [
  { id: 1, name: "Patricia Garrett", initials: "PG", phone: "(513) 702-3199", email: "stillbelieve54@gmail.com", created: "Jul 10 2025", lastActivity: "4 days ago", tags: ["MAPD"], risk: "High", status: "Active", owner: "You", unread: true },
  { id: 2, name: "Zain Marketing", initials: "ZM", phone: "+1 905 693 6475", email: "zainmarketingz8@gmail.com", created: "Jul 09 2025", lastActivity: "4 days ago", tags: ["PDP"], risk: "Low", status: "Active", owner: "You", unread: false },
  { id: 3, name: "Scott Fluegel", initials: "SF", phone: "(859) 222-4444", email: "fluegel.scott@gmail.com", created: "Jul 09 2025", lastActivity: "4 weeks ago", tags: ["D-SNP", "Hot Lead"], risk: "Medium", status: "Prospect", owner: "Spencer", unread: false },
  { id: 4, name: "Janik Lilienthal", initials: "JL", phone: "(859) 333-5555", email: "jlilienthal@gmail.com", created: "Jul 09 2025", lastActivity: "4 weeks ago", tags: [], risk: "Medium", status: "Inactive", owner: "You", unread: true },
];

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
  { key: "actions", label: "", width: "w-8" }
];

const importableFields = [
  "Name", "Phone", "Email", "Created", "Last Activity", "Tags", "Risk", "Status", "Owner"
];

const Clients = () => {
  const [clients, setClients] = useState(DEMO_CLIENTS);
  const [selected, setSelected] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [fieldMap, setFieldMap] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(columnDefs.map(c => c.key));
  const fileInput = useRef();

  const navigate = useNavigate();

  // Bulk select handlers
  const handleSelectAll = e =>
    setSelected(e.target.checked ? clients.map(c => c.id) : []);
  const handleSelect = id =>
    setSelected(sel => (sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]));

  // CSV import demo
  const handleImportFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = ev.target.result.split("\n").map(r => r.trim()).filter(Boolean);
      const headers = rows[0].split(",");
      setFieldMap(Object.fromEntries(headers.map(h => [h, ""])));
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  const handleBulkDelete = () => {
    setClients(cs => cs.filter(c => !selected.includes(c.id)));
    setSelected([]);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-2 md:p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#172A3A] tracking-tight mb-1">
            Clients
          </h1>
          <div className="text-gray-500 text-xs md:text-sm">
            All your clients, prospects & contacts in one place.
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/clients/new"
            className="flex items-center gap-2 bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold rounded-xl px-4 py-2 shadow transition text-xs md:text-base"
          >
            <Plus size={18} /> Add Client
          </Link>
          <button
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border px-4 py-2 rounded-xl shadow transition text-xs md:text-base"
            onClick={() => setShowImport(true)}
          >
            <UploadCloud size={18} /> Import
          </button>
          <button
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border px-4 py-2 rounded-xl shadow transition text-xs md:text-base"
            onClick={() => alert("Exporting CSV... (Demo only)")}
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            onClick={handleBulkDelete}
            disabled={selected.length === 0}
          >
            <Trash2 size={16} /> Delete
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            disabled={selected.length === 0}
          >
            <Mail size={16} /> Email
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            disabled={selected.length === 0}
          >
            <MessageCircle size={16} /> SMS
          </button>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            disabled={selected.length === 0}
          >
            <UserPlus size={16} /> Assign
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            onClick={() => setShowColumns(v => !v)}
          >
            <SlidersHorizontal size={16} /> Columns
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              className="pl-8 pr-3 py-1.5 rounded-lg border bg-white shadow-sm text-xs md:text-base"
              placeholder="Quick search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border shadow-sm hover:bg-gray-50 text-xs"
            onClick={() => alert("Filter drawer coming soon")}
          >
            <Filter size={16} /> More Filters
          </button>
        </div>
      </div>

      {/* Columns chooser */}
      {showColumns && (
        <div className="bg-white shadow-lg rounded-xl border absolute right-8 z-30 mt-2 p-4 min-w-[240px]">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-[#172A3A]">Show Columns</div>
            <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowColumns(false)}>
              <X size={16} />
            </button>
          </div>
          {columnDefs.map(col => (
            <label key={col.key} className="flex items-center gap-2 mb-1 text-sm">
              <input
                type="checkbox"
                checked={columns.includes(col.key)}
                disabled={["select","name","actions"].includes(col.key)}
                onChange={e => setColumns(cols =>
                  e.target.checked ? [...cols, col.key] : cols.filter(c => c !== col.key)
                )}
              />
              {col.label || col.key}
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-[#172A3A] text-white">
            <tr>
              {columnDefs.filter(col => columns.includes(col.key)).map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-2 text-left font-semibold ${col.width||""}`}
                  style={{ minWidth: 50 }}
                >
                  {col.key === "select" ? (
                    <input
                      type="checkbox"
                      checked={selected.length === filteredClients.length && filteredClients.length>0}
                      onChange={handleSelectAll}
                    />
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400">No clients found.</td></tr>
            ) : filteredClients.map(c => (
              <tr key={c.id} className={`border-b ${c.unread?"bg-blue-50":""} hover:bg-yellow-50`}>
                {columns.includes("select") && (
                  <td className="py-1 px-2">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>handleSelect(c.id)} />
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
                    <Mail size={13} className="inline-block text-[#FFB800]" /> {c.email}
                  </td>
                )}
                {columns.includes("created") && <td className="py-1 px-2">{c.created}</td>}
                {columns.includes("lastActivity") && (
                  <td className="py-1 px-2">
                    {c.unread ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} className="text-blue-600" /> {c.lastActivity}
                      </span>
                    ) : c.lastActivity}
                  </td>
                )}
                {columns.includes("tags") && (
                  <td className="py-1 px-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length===0 ? <span className="text-gray-300">—</span> : c.tags.map(tag=>(
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-bold ${TAG_COLORS[tag]||"bg-gray-100 text-gray-500"}`}>
                          {tag}
