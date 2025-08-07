import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus,
  UploadCloud,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Mail,
  MessageCircle,
  Phone,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  X
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

const Clients = () => {
  const [clients, setClients] = useState(DEMO_CLIENTS);
  const [selected, setSelected] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(columnDefs.map(c => c.key));
  const fileInput = useRef();
  const navigate = useNavigate();

  const handleSelectAll = e => setSelected(e.target.checked ? clients.map(c => c.id) : []);
  const handleSelect = id => setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  const handleBulkDelete = () => { setClients(cs => cs.filter(c => !selected.includes(c.id))); setSelected([]); };

  const handleImportFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      // simplistic import preview, discard for now
      setShowImport(false);
    };
    reader.readAsText(file);
  };

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

      {/* Columns chooser */}
      {showColumns && (
        <div className="absolute right-8 bg-white border shadow-lg rounded p-4 z-20">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Show Columns</h3>
            <button onClick={() => setShowColumns(false)}><X size={16} /></button>
          </div>
          {columnDefs.map(col => (
            <label key={col.key} className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={columns.includes(col.key)} disabled={["select","name","actions"].includes(col.key)} onChange={e => setColumns(cs => e.target.checked ? [...cs,col.key] : cs.filter(c=>c!==col.key))} /> {col.label || col.key}
            </label>
          ))}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto bg-white border rounded shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-[#172A3A] text-white">
            <tr>
              {columnDefs.filter(c => columns.includes(c.key)).map(col => (
                <th key={col.key} className={`py-2 px-2 ${col.width||''}`}>{col.key==='select'?<input type="checkbox" checked={selected.length===filteredClients.length&&filteredClients.length>0} onChange={handleSelectAll}/>:col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length===0 && <tr><td colSpan={columns.length} className="py-8 text-center text-gray-400">No clients found.</td></tr>}
            {filteredClients.map(c => (
              <tr key={c.id} className={`${c.unread?'bg-blue-50':''} border-b hover:bg-yellow-50`}>
                {columns.includes("select") && <td className="py-1 px-2"><input type="checkbox" checked={selected.includes(c.id)} onChange={()=>handleSelect(c.id)}/></td>}
                {columns.includes("initials") && <td className="py-1 px-2"><div className="w-7 h-7 rounded-full bg-[#172A3A] text-white flex items-center justify-center font-bold text-xs">{c.initials}</div></td>}
                {columns.includes("name") && <td className="py-1 px-2"><Link to={`/clients/${c.id}`} className="font-bold text-[#172A3A] hover:underline">{c.name}</Link></td>}
                {columns.includes("phone") && <td className="py-1 px-2">{c.phone}</td>}
                {columns.includes("email") && <td className="py-1 px-2 flex items-center gap-1"><Mail size={14} className="text-[#FFB800]"/>{c.email}</td>}
                {columns.includes("created") && <td className="py-1 px-2">{c.created}</td>}
                {columns.includes("lastActivity") && <td className="py-1 px-2">{c.unread?<><Mail size={12} className="text-blue-600"/> {c.lastActivity}</>:c.lastActivity}</td>}
                {columns.includes("tags") && <td className="py-1 px-2"><div className="flex flex-wrap gap-1">{c.tags.length===0?<span className="text-gray-300">—</span>:(c.tags.map(tag=>(<span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-bold ${TAG_COLORS[tag]||'bg-gray-100 text-gray-500'}`}>{tag}</span>)))}</div></td>}
                {columns.includes("risk") && <td className="py-1 px-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RISK_COLORS[c.risk]}`}>{c.risk}</span></td>}
                {columns.includes("status") && <td className="py-1 px-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>}
                {columns.includes("owner") && <td className="py-1 px-2">{c.owner}</td>}
                {columns.includes("actions") && <td className="py-1 px-2 text-right"><div className="flex gap-2"><Edit2 size={16} className="text-gray-500 hover:text-blue-800"/><Phone size={16} className="text-gray-500 hover=text-blue-800"/><MessageCircle size={16} className="text-gray-500 hover:text-blue-800"/><MoreHorizontal size={16} className="text-gray-500 hover:text-blue-800"/></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500"><div>Total {filteredClients.length} record{filteredClients.length!==1?'s':''}</div><div className="flex gap-1"><button className="px-2 py-1 rounded hover:bg-gray-100">&lt;</button><span>1</span><button className="px-2 py-1 rounded hover:bg-gray-100">&gt;</button></div></div>

      {/* Add Client Modal */}
      {showAdd && (<div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center"><div className="bg-white rounded-xl shadow-2xl p-6 w-[380px] max-w-full relative"><button onClick={()=>setShowAdd(false)} className="absolute top-2 right-2 text-gray-400 hover:text-black"><X size={18}/></button><h2 className="text-xl font-bold text-[#172A3A] mb-2">Add Client</h2><p className="text-gray-500 text-xs mb-3">(*Demo only)</p><form className="space-y-2"><input className="w-full px-3 py-2 border rounded text-sm" placeholder="Name"/><input className="w-full px-3 py-2 border rounded text-sm" placeholder="Phone"/><input className="w-full px-3 py-2 border rounded text-sm" placeholder="Email"/><input className="w-full px-3 py-2 border rounded text-sm" placeholder="Tags (comma sep)"/><div className="flex gap-2"><select className="flex-1 px-3 py-2 border rounded text-sm"><option>Risk</option><option>High</option><option>Medium</option><option>Low</option></select><select className="flex-1 px-3 py-2 border rounded text-sm"><option>Status</option><option>Active</option><option>Prospect</option><option>Inactive</option></select></div><input className="w-full px-3 py-2 border rounded text-sm" placeholder="Owner"/><button type="button" onClick={()=>setShowAdd(false)} className="w-full bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold py-2 rounded-xl shadow">Save (Demo)</button></form></div></div>)}

      {/* Import Modal */}
      {showImport && (<div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center"><div className="bg-white rounded-xl shadow-2xl p-6 w-[430px] max-w-full relative"><button onClick={()=>setShowImport(false)} className="absolute top-2 right-2 text-gray-400 hover=text-black"><X size={18}/></button><h2 className="text-xl font-bold text-[#172A3A] mb-3">Import Clients</h2><div><input type="file" accept=".csv" ref={fileInput} onChange={handleImportFile} className="mb-2"/><p className="text-xs text-gray-500 mb-4">Upload a CSV; mapping not implemented.</p><button onClick={()=>fileInput.current.click()} className="w-full bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-4 py-2 rounded-xl font-bold shadow transition">Select CSV File</button></div></div></div>)}
    </div>
  );
};

export default Clients;
