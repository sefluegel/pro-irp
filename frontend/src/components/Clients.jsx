import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, UploadCloud, Download, Search, Filter, MoreHorizontal,
  Edit2, Mail, MessageCircle, Phone, Trash2, UserPlus,
  SlidersHorizontal, ChevronDown, X
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
  const [showAdd, setShowAdd] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [fieldMap, setFieldMap] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(columnDefs.map(c => c.key));
  const fileInput = useRef();

  const navigate = useNavigate();

  const handleSelectAll = e => setSelected(e.target.checked ? clients.map(c => c.id) : []);
  const handleSelect = id => setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);

  const handleImportFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = ev.target.result.split("\n").map(r => r.trim()).filter(Boolean);
      const headers = rows[0].split(",");
      setFieldMap(Object.fromEntries(headers.map(h => [h, ""])));
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  const handleBulkDelete = () => { setClients(cs => cs.filter(c => !selected.includes(c.id))); setSelected([]); };

  const filteredClients = clients.filter(c =>
    search === "" ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#172A3A]">Clients</h1>
          <p className="text-gray-500">All your clients, prospects & contacts.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/clients/new" className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition">
            <Plus size={18} /> Add Client
          </Link>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition">
            <UploadCloud size={18} /> Import
          </button>
          <button onClick={() => alert('Exporting CSV...')} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition">
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button disabled={!selected.length} onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 transition text-xs">
            <Trash2 size={14} /> Delete
          </button>
          <button disabled={!selected.length} className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 transition text-xs">
            <Mail size={14} /> Email
          </button>
          <button disabled={!selected.length} className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 transition text-xs">
            <MessageCircle size={14} /> SMS
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowColumns(v => !v)} className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 transition text-xs">
            <SlidersHorizontal size={14} /> Columns
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-8 pr-2 py-1 rounded border shadow-sm text-xs" />
          </div>
          <button onClick={() => alert('Filters coming soon')} className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 transition text-xs">
            <Filter size={14} /> More Filters
          </button>
        </div>
      </div>

      {/* Column chooser */}
      {showColumns && (
        <div className="absolute right-8 bg-white border shadow-lg rounded p-4 z-20">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Show Columns</n
